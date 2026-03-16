/**
 * lib/inngest/functions.ts
 *
 * The news pipeline as an Inngest function.
 * Each article is processed as a durable step so failures are retried
 * independently and the job survives serverless cold-starts.
 *
 * Events
 * ──────
 * Trigger : { name: 'news/pipeline.requested' }
 * Emitted : { name: 'news/article.processed', data: { articleId, title, sourceUrl } }
 *
 * FIXES applied
 * ─────────────
 * 1. Removed `logger` from destructured params — not available in Inngest v3.
 * 2. Replaced `inngest.send()` inside step with `step.sendEvent()` — required in v3.
 * 3. Changed `Promise.allSettled(links.map(…step.run…))` to a sequential for-loop —
 *    concurrent step.run() calls in one function are not supported by Inngest.
 * 4. Fixed firecrawl response shape handling — firecrawl.search() returns
 *    { data: SearchResult[] }, NOT a plain array. Calling .filter() on the object
 *    was throwing "filter is not a function". Added toStringArray() / toSearchResults()
 *    normalizers that handle every shape the SDK may return.
 * 5. Fixed import path for inngest client (was a circular self-import in the old file).
 */

import { inngest } from './client'
import Firecrawl from '@mendable/firecrawl-js'
import { OpenAI } from 'openai'
import { createArticle } from '@/lib/db/articles'

// ─── Clients ──────────────────────────────────────────────────────────────────

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY ?? 'fc-da0837003c26469da0f8c259c6c10944',
})

const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_API_KEY ?? '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',
})

const HF_MODEL = process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArticleLink {
  url: string
  title: string | null
}

interface ScrapedPage {
  url: string
  title: string | null
  markdown: string
  image: string | null
}

interface GeneratedArticle {
  title: string
  description: string
  content: string
  category: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractImage(page: any): string | null {
  const og = page?.metadata?.ogImage ?? page?.metadata?.image ?? null
  if (og && typeof og === 'string' && og.startsWith('http')) return og
  if (page?.html) {
    const m = (page.html as string).match(/<img[^>]+src=["']([^"']+)["']/i)
    if (m?.[1]?.startsWith('http')) return m[1]
  }
  if (page?.markdown) {
    const m = (page.markdown as string).match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
    if (m?.[1]) return m[1]
  }
  return null
}

/**
 * Normalise the value returned by firecrawl.map() into a plain string[].
 * The SDK can return:
 *   - string[]                 (older versions)
 *   - { links: string[] }      (current MapResponse)
 *   - { urls: string[] }       (undocumented alternate key seen in the wild)
 */
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (Array.isArray(v.links)) return v.links.filter((x): x is string => typeof x === 'string')
    if (Array.isArray(v.urls))  return v.urls.filter((x): x is string => typeof x === 'string')
  }
  return []
}

/**
 * Normalise the value returned by firecrawl.search() into a plain object[].
 * The SDK returns SearchResponse { data: SearchResult[] }, NOT a plain array.
 * The original code did `(results || []).filter(…)` which threw
 * "filter is not a function" because `results` is an object, not an array.
 */
function toSearchResults(value: unknown): Array<{ url: string; title?: string }> {
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data
  }
  if (Array.isArray(value)) return value
  return []
}

async function crawlYahooNewsLinks(): Promise<ArticleLink[]> {
  // ── Strategy 1: firecrawl.map ────────────────────────────────────────────
  try {
    const mapResult = await (firecrawl as any).map(
      'https://www.yahoo.com/news/articles/',
      { limit: 30, includeSubdomains: false }
    )

    const rawLinks = toStringArray(mapResult)
    const links = rawLinks
      .filter(url =>
        url.includes('yahoo.com') &&
        /\/news\/articles\/[a-z0-9-]{10,}/i.test(url)
      )
      .slice(0, 10)
      .map(url => ({ url, title: null as null }))

    console.log(`[inngest] map found ${links.length} links`)
    if (links.length >= 5) return links
  } catch (err) {
    console.warn('[inngest] firecrawl.map failed, falling back to search:', err)
  }

  // ── Strategy 2: firecrawl.search ─────────────────────────────────────────
  try {
    const searchResult = await (firecrawl as any).search(
      'site:yahoo.com/news latest news today',
      { limit: 10, scrapeOptions: { formats: ['markdown'] } }
    )

    // FIX: toSearchResults() unwraps { data: […] } so we always get a plain array.
    const results = toSearchResults(searchResult)

    const links = results
      .filter(r => typeof r?.url === 'string' && r.url.includes('yahoo.com'))
      .slice(0, 10)
      .map(r => ({ url: r.url, title: r.title ?? null }))

    console.log(`[inngest] search found ${links.length} links`)
    return links
  } catch (err) {
    console.warn('[inngest] firecrawl.search failed:', err)
    return []
  }
}

async function scrapeArticle(link: ArticleLink): Promise<ScrapedPage | null> {
  try {
    const page = (await firecrawl.scrapeUrl(link.url, {
      formats: ['markdown', 'html'],
    })) as any

    const markdown = ((page?.markdown ?? '') as string).slice(0, 5000)
    if (markdown.length < 100) return null

    return {
      url: link.url,
      title: (page?.metadata?.title as string | undefined) ?? link.title ?? null,
      markdown,
      image: extractImage(page),
    }
  } catch (err) {
    console.warn(`[inngest] scrape failed for ${link.url}:`, err)
    return null
  }
}

async function generateArticle(page: ScrapedPage): Promise<GeneratedArticle> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a professional news journalist.
Write a full news article based ONLY on the provided source material.
Respond with ONLY a valid JSON object in this exact format (no code fences, no extra text):
{
  "title": "<compelling headline>",
  "description": "<2-sentence summary for the article card>",
  "content": "<full article body, 4-5 paragraphs, plain text only>",
  "category": "<one of: Business | Technology | Sports | Entertainment | Science | Health | World>"
}`,
    },
    {
      role: 'user',
      content: `Source URL: ${page.url}\n\nSource content:\n\n${page.markdown}`,
    },
  ]

  const stream = await hfClient.chat.completions.create({
    model: HF_MODEL,
    messages,
    stream: true,
    max_tokens: 1200,
    temperature: 0.6,
  })

  let raw = ''
  for await (const chunk of stream) {
    raw += chunk.choices[0]?.delta?.content ?? ''
  }

  const clean = raw.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return {
      title: String(parsed.title ?? page.title ?? 'Untitled'),
      description: String(parsed.description ?? ''),
      content: String(parsed.content ?? ''),
      category: String(parsed.category ?? 'World'),
    }
  } catch {
    const titleMatch = raw.match(/TITLE:\s*(.+)/i)
    return {
      title: titleMatch?.[1]?.trim() ?? page.title ?? 'Untitled',
      description: '',
      content: raw.trim(),
      category: 'World',
    }
  }
}

async function saveToNeon(
  generated: GeneratedArticle,
  page: { image: string | null }
): Promise<string | null> {
  const wordCount = generated.content.split(/\s+/).length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const saved = await createArticle({
    title: generated.title,
    description: generated.description,
    content: generated.content,
    category: generated.category,
    author: 'AI Pipeline',
    date: new Date(),
    image: page.image ?? '',
    readTime,
    featured: false,
    breaking: false,
    trending: false,
    ogImage: page.image ?? undefined,
    twitterCard: 'summary_large_image',
    visibility: 'public',
    status: 'published',
    noIndex: false,
    allowComments: true,
    showInRss: true,
    ampEnabled: false,
  })

  return saved?.id ?? null
}

// ─── Inngest Function ─────────────────────────────────────────────────────────

export const newsPipelineFunction = inngest.createFunction(
  {
    id: 'news-pipeline',
    name: 'Yahoo News Pipeline',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { event: 'news/pipeline.requested' },

  // FIX: removed `logger` — not a valid Inngest v3 param; use console instead.
  async ({ step }) => {
    // ── Step 1: Crawl ────────────────────────────────────────────────────────
    const links = await step.run('crawl-yahoo-news', async () => {
      console.log('[inngest] Crawling Yahoo News…')
      const found = await crawlYahooNewsLinks()
      if (!found.length) throw new Error('No article links found on Yahoo News')
      console.log(`[inngest] Found ${found.length} links`)
      return found
    })

    // ── Steps 2–4: Per-article scrape → generate → save ──────────────────────
    // FIX: steps must be sequential — Promise.allSettled with step.run() is not
    // supported by Inngest and causes the function to silently fail or deadlock.
    const articles: Array<
      | { sourceUrl: string; title: string; articleId: string | null }
      | { sourceUrl: string; error: string }
    > = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]

      const result = await step
        .run(`process-article-${i}`, async () => {
          console.log(`[inngest] [${i + 1}/${links.length}] scraping: ${link.url}`)

          const page = await scrapeArticle(link)
          if (!page) throw new Error('Could not scrape content')

          console.log(`[inngest] [${i + 1}/${links.length}] generating…`)
          const generated = await generateArticle(page)

          console.log(`[inngest] [${i + 1}/${links.length}] saving to Neon…`)
          const articleId = await saveToNeon(generated, page)

          // FIX: use step.sendEvent() instead of inngest.send() inside a function.
          // Calling inngest.send() directly bypasses Inngest's event tracking and
          // can cause duplicate events on retries.
          await step.sendEvent('article-processed-event', {
            name: 'news/article.processed',
            data: { articleId, title: generated.title, sourceUrl: link.url },
          })

          console.log(`[inngest] ✓ "${generated.title}" → id:${articleId}`)
          return { sourceUrl: link.url, title: generated.title, articleId }
        })
        // Catch per-step so one failure doesn't abort the whole pipeline
        .catch((err: unknown) => ({
          sourceUrl: link.url,
          error: err instanceof Error ? err.message : String(err),
        }))

      articles.push(result)
    }

    const done = articles.filter(r => !('error' in r)).length
    const failed = articles.filter(r => 'error' in r).length

    return {
      total: links.length,
      done,
      failed,
      articles,
    }
  }
)