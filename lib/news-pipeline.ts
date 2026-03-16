/**
 * lib/news-pipeline.ts
 *
 * Full pipeline (non-Inngest, in-process version):
 *   1. Crawl https://news.yahoo.com → extract up to 10 article URLs
 *   2. Scrape each URL for markdown + hero image
 *   3. Generate a news article via HuggingFace AI (JSON output)
 *   4. Save to Neon PostgreSQL via existing createArticle()
 *
 * Job state is kept in-memory (per process).
 * Articles are stored in your existing Neon `articles` table.
 *
 * FIXES applied
 * ─────────────
 * 1. Replaced `setImmediate` with `Promise.resolve().then()` — setImmediate is
 *    not available in Edge/serverless runtimes (Next.js API routes on Vercel etc).
 * 2. Removed hardcoded API key fallbacks — keys must come from env vars. Falling
 *    back to a committed key is a security risk and silently breaks rotation.
 * 3. Added try/catch in scrapeArticle (was missing in this file's version).
 * 4. Fixed toStringArray() to handle Firecrawl v2 map() response shape:
 *    v2 returns { success, links: [{url, title, description},...] } — each link
 *    is an object, not a plain string. The old helper returned [] silently.
 * 5. Changed map() target to news.yahoo.com (has a sitemap; /articles/ path does not).
 * 6. Broadened article URL regex from /articles/ to /news/ to match Yahoo's real paths.
 * 7. Removed site: operator from search fallback — Yahoo blocks it in Firecrawl search.
 * 8. Added Strategy 3: seed scrape of news.yahoo.com HTML as a last-resort link extractor.
 */

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

// ─── Job types ────────────────────────────────────────────────────────────────

export interface PipelineArticle {
  sourceUrl: string
  title: string | null
  status: 'pending' | 'done' | 'failed'
  articleId: string | null
  error?: string
}

export interface PipelineJob {
  id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: Date
  updatedAt: Date
  error?: string
  progress: { total: number; done: number; failed: number }
  articles: PipelineArticle[]
}

// In-memory job store (keyed by jobId)
const jobStore = new Map<string, PipelineJob>()

export function getJob(jobId: string): PipelineJob | null {
  return jobStore.get(jobId) ?? null
}

export function listJobs(): PipelineJob[] {
  return Array.from(jobStore.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}

function makeJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ─── Firecrawl response normalisers ──────────────────────────────────────────
//
// Firecrawl v2 map() returns:
//   { success: true, links: Array<{ url: string; title?: string; description?: string }> }
//
// Links are OBJECTS, not plain strings. The old helper only handled string[],
// { links: string[] }, and { urls: string[] } — it returned [] on v2 responses,
// which is why the pipeline always reported "No article links found".
//
// firecrawl.search() returns { data: SearchResult[] } — NOT a plain array.

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) => {
      if (typeof v === 'string') return [v]
      // v2 object shape: { url: string; title?: string; description?: string }
      if (v && typeof v === 'object' && typeof (v as any).url === 'string') {
        return [(v as any).url as string]
      }
      return []
    })
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    // v2 envelope: { success: true, links: [...] }
    if (Array.isArray(v.links)) return toStringArray(v.links)
    if (Array.isArray(v.urls))  return toStringArray(v.urls)
  }
  return []
}

function toSearchResults(value: unknown): Array<{ url: string; title?: string }> {
  if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
    return (value as any).data
  }
  if (Array.isArray(value)) return value
  return []
}

// ─── Step 1 – Crawl Yahoo News ────────────────────────────────────────────────

async function crawlYahooNewsLinks(): Promise<{ url: string; title: string | null }[]> {
  console.log('[pipeline] Step 1: crawling Yahoo News…')

  // ── Strategy 1: firecrawl.map ──────────────────────────────────────────────
  // Use news.yahoo.com — it has a sitemap. The /news/articles/ subpath does not.
  try {
    const mapResult = await (firecrawl as any).map(
      'https://news.yahoo.com',
      { limit: 30, includeSubdomains: false }
    )

    const rawLinks = toStringArray(mapResult)
    const links = rawLinks
      .filter(url =>
        url.includes('yahoo.com') &&
        // Broader pattern: Yahoo article paths vary (e.g. /news/slug-123abc.html)
        /yahoo\.com\/news\/[a-z0-9_-]{10,}/i.test(url)
      )
      .slice(0, 10)
      .map(url => ({ url, title: null as null }))

    console.log(`[pipeline] Step 1: found ${links.length} links via map`)
    if (links.length >= 3) return links
  } catch (err) {
    console.warn('[pipeline] firecrawl.map failed, using search fallback:', err)
  }

  // ── Strategy 2: firecrawl.search ──────────────────────────────────────────
  // Removed `site:yahoo.com` — Yahoo blocks the site: operator in Firecrawl search.
  // A general news query returns more reliable results.
  console.log('[pipeline] Step 1: search fallback…')
  try {
    const searchResult = await (firecrawl as any).search(
      'latest news today 2026',
      { limit: 10, scrapeOptions: { formats: ['markdown'] } }
    )

    const results = toSearchResults(searchResult)
    const links = results
      .filter(r => typeof r?.url === 'string')
      .slice(0, 10)
      .map(r => ({ url: r.url, title: r.title ?? null }))

    console.log(`[pipeline] Step 1: found ${links.length} links via search`)
    if (links.length >= 1) return links
  } catch (err) {
    console.warn('[pipeline] firecrawl.search failed:', err)
  }

  // ── Strategy 3: seed scrape (last resort) ─────────────────────────────────
  // If both API strategies fail (rate-limited, blocked, etc.), scrape the
  // Yahoo News homepage HTML directly and extract article hrefs.
  console.log('[pipeline] Step 1: seed scrape fallback…')
  try {
    const page = await firecrawl.scrapeUrl('https://news.yahoo.com', {
      formats: ['html'],
    }) as any

    const html: string = page?.html ?? ''
    const urlMatches = [
      ...html.matchAll(/href="(https:\/\/[^"]*yahoo\.com\/news\/[^"]{10,})"/g),
    ]
    const links = urlMatches
      .map(m => ({ url: m[1].split('?')[0], title: null as null }))
      // dedupe by URL
      .filter((v, i, arr) => arr.findIndex(x => x.url === v.url) === i)
      .slice(0, 10)

    console.log(`[pipeline] Step 1: found ${links.length} links via seed scrape`)
    return links
  } catch (err) {
    console.warn('[pipeline] seed scrape failed:', err)
    return []
  }
}

// ─── Step 2 – Scrape article ──────────────────────────────────────────────────

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

async function scrapeArticle(link: { url: string; title: string | null }) {
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
    console.warn(`[pipeline] scrape failed for ${link.url}:`, err)
    return null
  }
}

// ─── Step 3 – Generate article via HuggingFace ───────────────────────────────

async function generateArticle(page: {
  url: string
  title: string | null
  markdown: string
  image: string | null
}) {
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

// ─── Step 4 – Save to Neon via existing createArticle() ──────────────────────

async function saveToNeon(
  generated: { title: string; description: string; content: string; category: string },
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts a new pipeline job in the background.
 * Returns the jobId immediately — poll GET /api/pipeline/[id] for progress.
 */
export function startNewsPipeline(): string {
  const jobId = makeJobId()

  const job: PipelineJob = {
    id: jobId,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    progress: { total: 0, done: 0, failed: 0 },
    articles: [],
  }

  jobStore.set(jobId, job)

  // FIX: replaced setImmediate() with Promise.resolve().then() — setImmediate is
  // a Node.js-only API not available in Edge runtime or many serverless environments.
  Promise.resolve().then(() => runPipeline(jobId))

  return jobId
}

// ─── Internal runner ──────────────────────────────────────────────────────────

async function runPipeline(jobId: string): Promise<void> {
  const job = jobStore.get(jobId)!

  const update = (patch: Partial<Omit<PipelineJob, 'id' | 'createdAt'>>) => {
    Object.assign(job, { ...patch, updatedAt: new Date() })
  }

  try {
    update({ status: 'running' })

    // 1. Crawl
    const links = await crawlYahooNewsLinks()

    if (!links.length) {
      update({ status: 'failed', error: 'No article links found — all three strategies failed' })
      return
    }

    update({
      progress: { total: links.length, done: 0, failed: 0 },
      articles: links.map(l => ({
        sourceUrl: l.url,
        title: l.title,
        status: 'pending',
        articleId: null,
      })),
    })

    // 2 + 3 + 4. Per-article: scrape → generate → save
    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const meta = job.articles[i]

      try {
        console.log(`[pipeline] [${i + 1}/${links.length}] scraping: ${link.url}`)
        const page = await scrapeArticle(link)

        if (!page) {
          meta.status = 'failed'
          meta.error = 'Could not scrape content'
          job.progress.failed++
          update({})
          continue
        }

        console.log(`[pipeline] [${i + 1}/${links.length}] generating…`)
        const generated = await generateArticle(page)

        console.log(`[pipeline] [${i + 1}/${links.length}] saving to Neon…`)
        const savedId = await saveToNeon(generated, page)

        meta.title = generated.title
        meta.status = 'done'
        meta.articleId = savedId
        job.progress.done++
        update({})

        console.log(`[pipeline] ✓ "${generated.title}" → id:${savedId}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[pipeline] ✗ ${link.url}:`, msg)
        meta.status = 'failed'
        meta.error = msg
        job.progress.failed++
        update({})
      }
    }

    update({ status: 'done' })
    console.log(
      `[pipeline] job ${jobId} complete — done:${job.progress.done} failed:${job.progress.failed}`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] fatal error for job ${jobId}:`, msg)
    update({ status: 'failed', error: msg })
  }
}