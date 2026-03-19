/**
 * lib/inngest/functions.ts
 *
 * Uses the FireScrape API (https://parallaxa-py-1.onrender.com) instead of
 * Playwright for all crawling and scraping.
 */

import { inngest } from './client'
import { OpenAI } from 'openai'
import { createArticle } from '@/lib/db/articles'

// ─── Config ───────────────────────────────────────────────────────────────────

const FIRESCRAPE_BASE = 'https://parallaxa-py-1.onrender.com'

// ─── Clients ──────────────────────────────────────────────────────────────────

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

// ─── FireScrape API types ─────────────────────────────────────────────────────

interface FireScrapeMetadata {
  title?: string
  ogImage?: string
  twitterImage?: string
  [key: string]: unknown
}

interface FireScrapeScrapeResult {
  markdown?: string
  text?: string
  links?: string[]
  metadata?: FireScrapeMetadata
  error?: string
}

interface FireScrapeCrawlJob {
  job_id: string
  status: string
}

interface FireScrapeCrawlStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  results?: FireScrapeScrapeResult[]
  pages?: FireScrapeScrapeResult[]
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function isRealArticleUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('yahoo.com')) return false

    const path = u.pathname
    if (!path.includes('/news/')) return false

    if (/\/(video|photos?|slideshow|live|tag|topic|section|author|category)\//i.test(path)) return false

    const slug = path.split('/').filter(Boolean).pop() ?? ''
    if (slug.length < 8) return false
    if (/^(news|sports|finance|entertainment|lifestyle|health|science|technology|world)$/.test(slug)) return false

    return true
  } catch {
    return false
  }
}

// ─── FireScrape helpers ───────────────────────────────────────────────────────

/**
 * Scrape a single URL via POST /v1/scrape.
 * Returns markdown, metadata (title, images), and links.
 */
async function firescrapeUrl(url: string): Promise<FireScrapeScrapeResult> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'metadata', 'links'],
      only_main_content: true,
      timeout: 30000,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`FireScrape scrape failed for ${url}: ${res.status} ${text}`)
  }

  return res.json() as Promise<FireScrapeScrapeResult>
}

/**
 * Start an async crawl via POST /v1/crawl, then poll until complete.
 * Returns the list of page results.
 */
async function firescrapeCrawl(
  startUrl: string,
  maxPages = 15,
  maxDepth = 2
): Promise<FireScrapeScrapeResult[]> {
  // Start the job
  const startRes = await fetch(`${FIRESCRAPE_BASE}/v1/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: startUrl,
      max_pages: maxPages,
      max_depth: maxDepth,
      same_domain: true,
      formats: ['links', 'metadata'],
      include_patterns: ['.*/news/.*'],
    }),
  })

  if (!startRes.ok) {
    const text = await startRes.text().catch(() => startRes.statusText)
    throw new Error(`FireScrape crawl start failed for ${startUrl}: ${startRes.status} ${text}`)
  }

  const { job_id }: FireScrapeCrawlJob = await startRes.json()
  console.log(`[firescrape] crawl job started: ${job_id}`)

  // Poll until done (max 2 minutes)
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await sleep(4_000)

    const pollRes = await fetch(`${FIRESCRAPE_BASE}/v1/crawl/${job_id}`)
    if (!pollRes.ok) {
      console.warn(`[firescrape] poll error ${pollRes.status} for job ${job_id}`)
      continue
    }

    const status: FireScrapeCrawlStatus = await pollRes.json()
    console.log(`[firescrape] job ${job_id} status: ${status.status}`)

    if (status.status === 'completed') {
      return status.results ?? status.pages ?? []
    }
    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`FireScrape crawl job ${job_id} ended with status: ${status.status}`)
    }
  }

  throw new Error(`FireScrape crawl job ${job_id} timed out after 2 minutes`)
}

/**
 * Use POST /v1/map for fast URL discovery without full content extraction.
 */
async function firescrapeMap(url: string, maxPages = 50): Promise<string[]> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, 
      include_sitemap: false,
      max_pages:
      maxPages, 
      same_domain: true }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`FireScrape map failed for ${url}: ${res.status} ${text}`)
  }

  const data = await res.json() as { urls?: string[]; links?: string[] }
  return data.urls ?? data.links ?? []
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Article link discovery ───────────────────────────────────────────────────

/**
 * Discover Yahoo News article links using FireScrape.
 *
 * Strategy:
 *  1. /v1/map on yahoo.com/news — fast, gets lots of URLs
 *  2. Fall back to /v1/scrape on multiple sources for their `links` field
 *  3. Filter to real article URLs
 */
async function crawlYahooNewsLinks(limit = 10): Promise<ArticleLink[]> {
  const collected = new Map<string, ArticleLink>()

  // ── Strategy 1: map yahoo.com/news ──────────────────────────────────────────
  try {
    console.log('[firescrape] mapping yahoo.com/news…')
    const mapped = await firescrapeMap('https://yahoo.com/news', 60)
    for (const url of mapped) {
      const clean = url.split('?')[0]
      if (isRealArticleUrl(clean) && !collected.has(clean)) {
        collected.set(clean, { url: clean, title: null })
      }
    }
    console.log(`[firescrape] map yielded ${collected.size} article URLs`)
  } catch (err) {
    console.warn('[firescrape] map failed, falling back:', err)
  }

  // ── Strategy 2: scrape link-rich pages ──────────────────────────────────────
  if (collected.size < limit) {
    const SOURCES = [
      'https://yahoo.com/news',
      'https://finance.yahoo.com/news/',
      'https://search.yahoo.com/search?p=latest+news+today&fr=news',
    ]

    for (const source of SOURCES) {
      if (collected.size >= limit) break
      try {
        console.log(`[firescrape] scraping links from ${source}…`)
        const result = await firescrapeUrl(source)
        const links: string[] = result.links ?? []

        for (const url of links) {
          const clean = url.split('?')[0]
          if (isRealArticleUrl(clean) && !collected.has(clean)) {
            collected.set(clean, { url: clean, title: null })
          }
          if (collected.size >= limit) break
        }

        console.log(`[firescrape] after ${source}: ${collected.size} article URLs`)
      } catch (err) {
        console.warn(`[firescrape] scrape-links failed for ${source}:`, err)
      }
    }
  }

  // ── Strategy 3: async crawl as last resort ───────────────────────────────────
  if (collected.size < limit) {
    try {
      console.log('[firescrape] starting async crawl on yahoo.com/news…')
      const pages = await firescrapeCrawl('https://yahoo.com/news', 20, 2)
      for (const page of pages) {
        for (const url of page.links ?? []) {
          const clean = url.split('?')[0]
          if (isRealArticleUrl(clean) && !collected.has(clean)) {
            collected.set(clean, {
              url: clean,
              title: null,
            })
          }
          if (collected.size >= limit) break
        }
      }
      console.log(`[firescrape] after crawl: ${collected.size} article URLs`)
    } catch (err) {
      console.warn('[firescrape] crawl strategy failed:', err)
    }
  }

  const result = [...collected.values()].slice(0, limit)
  console.log(`[firescrape] final unique article links: ${result.length}`)
  return result
}

// ─── Article scraping ─────────────────────────────────────────────────────────

async function scrapeArticle(link: ArticleLink): Promise<ScrapedPage | null> {
  try {
    console.log(`[firescrape] scraping article: ${link.url}`)
    const result = await firescrapeUrl(link.url)

    const markdown = result.markdown ?? result.text ?? ''
    if (markdown.length < 100) {
      console.warn(`[firescrape] insufficient content for ${link.url}`)
      return null
    }

    const meta = result.metadata ?? {}
    const title = meta.title ?? link.title ?? null
    const image =
      (typeof meta.ogImage === 'string' ? meta.ogImage : null) ??
      (typeof meta.twitterImage === 'string' ? meta.twitterImage : null) ??
      null

    return {
      url: link.url,
      title,
      markdown: markdown.slice(0, 5000),
      image,
    }
  } catch (err) {
    console.warn(`[firescrape] scrape failed for ${link.url}:`, err)
    return null
  }
}

// ─── AI generation ─────────────────────────────────────────────────────────────

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

// ─── DB persistence ────────────────────────────────────────────────────────────

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

  async ({ step }) => {
    // ── Step 1: Crawl ────────────────────────────────────────────────────────
    const links = await step.run('crawl-yahoo-news', async () => {
      console.log('[inngest] Crawling Yahoo News via FireScrape API…')
      const found = await crawlYahooNewsLinks(10)
      if (!found.length) throw new Error('No article links found on Yahoo News')
      console.log(`[inngest] Found ${found.length} links`)
      return found
    })

    // ── Steps 2–N: Per-article scrape → generate → save ───────────────────────
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

          await step.sendEvent('article-processed-event', {
            name: 'news/article.processed',
            data: { articleId, title: generated.title, sourceUrl: link.url },
          })

          console.log(`[inngest] ✓ "${generated.title}" → id:${articleId}`)
          return { sourceUrl: link.url, title: generated.title, articleId }
        })
        .catch((err: unknown) => ({
          sourceUrl: link.url,
          error: err instanceof Error ? err.message : String(err),
        }))

      articles.push(result)
    }

    const done = articles.filter((r) => !('error' in r)).length
    const failed = articles.filter((r) => 'error' in r).length

    return { total: links.length, done, failed, articles }
  }
)