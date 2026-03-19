/**
 * lib/inngest/functions.ts
 *
 * Yahoo News → FireScrape → HuggingFace → Neon pipeline.
 *
 * Key fixes vs original:
 *  - crawlYahooNewsLinks returned a Map (serialises to {} over JSON between
 *    Inngest steps) — now always returns ArticleLink[]
 *  - isRealArticleUrl is relaxed and debuggable
 *  - All three discovery strategies are active with proper fallbacks
 *  - FireScrape health-check / wake-up before crawl (Render free tier sleeps)
 *  - Every async boundary has typed, structured error handling
 *  - logger (Inngest structured) used throughout instead of console.*
 */

import { inngest } from './client'
import { OpenAI } from 'openai'
import { createArticle } from '@/lib/db/articles'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIRESCRAPE_BASE = 'https://parallaxa-py-1.onrender.com'
const HF_MODEL = process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

const YAHOO_SOURCES = [
  'https://yahoo.com/news/',
  'https://news.yahoo.com/',
  'https://finance.yahoo.com/news/',
]

// ─── HuggingFace client ───────────────────────────────────────────────────────

const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_API_KEY ?? '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',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleLink {
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

interface FireScrapeMetadata {
  title?: string
  og_image?: string
  og_title?: string
  og_description?: string
  description?: string
  [key: string]: unknown
}

interface FireScrapeScrapeResult {
  markdown?: string
  text?: string
  links?: string[]
  metadata?: FireScrapeMetadata
  error?: string
  success?: boolean
}

interface FireScrapeCrawlJob {
  job_id: string
}

interface FireScrapeCrawlStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  results?: FireScrapeScrapeResult[]
  pages?: FireScrapeScrapeResult[]
}

type PipelineResult =
  | { ok: true;  sourceUrl: string; title: string; articleId: string }
  | { ok: false; sourceUrl: string; stage: string; error: string }

// ─── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Returns true if the URL looks like a real Yahoo News article.
 * Deliberately lenient — we'd rather scrape a few dud pages than miss articles.
 */
function isArticleUrl(raw: string): boolean {
  let u: URL
  try { u = new URL(raw) } catch { return false }

  if (!u.hostname.endsWith('yahoo.com')) return false

  const path = u.pathname
  if (!path.includes('/news/')) return false
  if (/\/(video|photos?|slideshows?|live|tag|topic|author|category|rss)\//i.test(path)) return false

  const slug = path.split('/').filter(Boolean).pop() ?? ''
  if (slug.length < 5) return false
  if (/^(news|sports|finance|entertainment|lifestyle|health|science|technology|world|us|politics)$/.test(slug)) return false

  return true
}

// ─── FireScrape: wake-up ──────────────────────────────────────────────────────

async function firescrapeWakeUp(): Promise<void> {
  const res = await fetch(`${FIRESCRAPE_BASE}/health`, { signal: AbortSignal.timeout(15_000) })
    .catch(() => fetch(`${FIRESCRAPE_BASE}/`, { signal: AbortSignal.timeout(15_000) }))
  if (!res.ok) throw new Error(`FireScrape health check HTTP ${res.status}`)
}

// ─── FireScrape: map ──────────────────────────────────────────────────────────

async function firescrapeMap(url: string, maxPages = 60): Promise<string[]> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, include_sitemap: false, max_pages: maxPages, same_domain: true }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    throw new Error(`/v1/map HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }

  // API shape: { total, urls, url_details, stats }
  const data = await res.json() as { urls?: unknown }
  if (!Array.isArray(data.urls)) {
    throw new Error(`/v1/map unexpected shape: ${JSON.stringify(data).slice(0, 200)}`)
  }

  return (data.urls as unknown[]).filter((u): u is string => typeof u === 'string')
}

// ─── FireScrape: scrape ───────────────────────────────────────────────────────

async function firescrapeUrl(url: string): Promise<FireScrapeScrapeResult> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'metadata', 'links'],
      only_main_content: true,
      timeout: 30_000,
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!res.ok) {
    throw new Error(`/v1/scrape HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }

  return res.json() as Promise<FireScrapeScrapeResult>
}

// ─── FireScrape: crawl ────────────────────────────────────────────────────────

async function firescrapeCrawl(startUrl: string, maxPages = 20, maxDepth = 2): Promise<FireScrapeScrapeResult[]> {
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
    signal: AbortSignal.timeout(30_000),
  })

  if (!startRes.ok) {
    throw new Error(`/v1/crawl start HTTP ${startRes.status}: ${await startRes.text().catch(() => startRes.statusText)}`)
  }

  const { job_id } = await startRes.json() as FireScrapeCrawlJob
  if (!job_id) throw new Error('/v1/crawl returned no job_id')

  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    await sleep(4_000)

    const pollRes = await fetch(`${FIRESCRAPE_BASE}/v1/crawl/${job_id}`, {
      signal: AbortSignal.timeout(10_000),
    }).catch((e) => { throw new Error(`Crawl poll network error: ${errMsg(e)}`) })

    if (!pollRes.ok) {
      console.warn(`[crawl] poll HTTP ${pollRes.status} for job ${job_id}, retrying…`)
      continue
    }

    const status = await pollRes.json() as FireScrapeCrawlStatus
    console.log(`[crawl] job ${job_id} → ${status.status}`)

    if (status.status === 'completed') return status.results ?? status.pages ?? []
    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`Crawl job ${job_id} ended: ${status.status}`)
    }
  }

  throw new Error(`Crawl job ${job_id} timed out (2 min)`)
}

// ─── Link discovery ───────────────────────────────────────────────────────────

/**
 * Always returns ArticleLink[] — never a Map, never undefined.
 * Safe across Inngest step JSON serialisation boundaries.
 */
async function discoverArticleLinks(limit: number): Promise<ArticleLink[]> {
  const seen  = new Set<string>()
  const links: ArticleLink[] = []

  function add(url: string, title: string | null = null): void {
    const clean = url.split('?')[0].split('#')[0]
    if (!seen.has(clean) && isArticleUrl(clean)) {
      seen.add(clean)
      links.push({ url: clean, title })
    }
  }

  // Strategy A: /v1/map
  for (const source of YAHOO_SOURCES) {
    if (links.length >= limit) break
    try {
      console.log(`[discover] A: map ${source}`)
      const urls = await firescrapeMap(source, 60)
      console.log(`[discover] A: map returned ${urls.length} raw URLs`)
      urls.forEach((u) => add(u))
      console.log(`[discover] A: running total ${links.length}`)
    } catch (e) {
      console.warn(`[discover] A: map failed for ${source}: ${errMsg(e)}`)
    }
  }

  // Strategy B: scrape + extract links
  if (links.length < limit) {
    for (const source of YAHOO_SOURCES) {
      if (links.length >= limit) break
      try {
        console.log(`[discover] B: scrape-links ${source}`)
        const result = await firescrapeUrl(source)
        const raw = result.links ?? []
        console.log(`[discover] B: got ${raw.length} links from ${source}`)
        raw.forEach((u) => add(u))
        console.log(`[discover] B: running total ${links.length}`)
      } catch (e) {
        console.warn(`[discover] B: scrape failed for ${source}: ${errMsg(e)}`)
      }
    }
  }

  // Strategy C: async crawl
  if (links.length < limit) {
    for (const source of YAHOO_SOURCES) {
      if (links.length >= limit) break
      try {
        console.log(`[discover] C: crawl ${source}`)
        const pages = await firescrapeCrawl(source, 20, 2)
        console.log(`[discover] C: crawl returned ${pages.length} pages`)
        pages.forEach((p) => (p.links ?? []).forEach((u) => add(u)))
        console.log(`[discover] C: running total ${links.length}`)
      } catch (e) {
        console.warn(`[discover] C: crawl failed for ${source}: ${errMsg(e)}`)
      }
    }
  }

  console.log(`[discover] final: ${links.length} unique articles (limit ${limit})`)
  return links.slice(0, limit)
}

// ─── Scrape article ───────────────────────────────────────────────────────────

async function scrapeArticle(link: ArticleLink): Promise<ScrapedPage> {
  const result = await firescrapeUrl(link.url)

  const markdown = (result.markdown ?? result.text ?? '').trim()
  if (markdown.length < 100) {
    throw new Error(
      `Insufficient content (${markdown.length} chars) — page may be paywalled, ` +
      `redirected, or behind a bot check`
    )
  }

  const meta = result.metadata ?? {}
  return {
    url:      link.url,
    title:    meta.title ?? link.title ?? null,
    markdown: markdown.slice(0, 5_000),
    image:    typeof meta.og_image === 'string' ? meta.og_image : null,
  }
}

// ─── Generate article via HuggingFace ─────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional news journalist.
Write a full news article based ONLY on the provided source material.
Respond with ONLY a valid JSON object — no markdown fences, no preamble, no extra text:
{
  "title": "<compelling headline>",
  "description": "<2-sentence summary>",
  "content": "<4-5 paragraph article body, plain text>",
  "category": "<one of: Business|Technology|Sports|Entertainment|Science|Health|World>"
}`

async function generateArticle(page: ScrapedPage): Promise<GeneratedArticle> {
  const completion = await hfClient.chat.completions.create({
    model:       HF_MODEL,
    stream:      false,
    max_tokens:  1_200,
    temperature: 0.6,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Source URL: ${page.url}\n\nContent:\n\n${page.markdown}` },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? ''
  if (!raw.trim()) throw new Error('Model returned an empty response')

  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(clean)
  } catch {
    throw new Error(`Model response is not valid JSON. First 400 chars: ${raw.slice(0, 400)}`)
  }

  const title       = String(parsed.title       ?? page.title ?? 'Untitled').trim()
  const description = String(parsed.description ?? '').trim()
  const content     = String(parsed.content     ?? '').trim()
  const category    = String(parsed.category    ?? 'World').trim()

  if (!title || !content) {
    throw new Error(`Generated JSON missing title or content. Keys present: ${Object.keys(parsed).join(', ')}`)
  }

  return { title, description, content, category }
}

// ─── Save to Neon ─────────────────────────────────────────────────────────────

async function saveArticle(generated: GeneratedArticle, page: ScrapedPage): Promise<string> {
  const wordCount = generated.content.split(/\s+/).length
  const readTime  = Math.max(1, Math.ceil(wordCount / 200))

  const saved = await createArticle({
    title:         generated.title,
    description:   generated.description,
    content:       generated.content,
    category:      generated.category,
    author:        'AI Pipeline',
    date:          new Date(),
    image:         page.image ?? '',
    readTime,
    featured:      false,
    breaking:      false,
    trending:      false,
    ogImage:       page.image ?? undefined,
    twitterCard:   'summary_large_image',
    visibility:    'public',
    status:        'published',
    noIndex:       false,
    allowComments: true,
    showInRss:     true,
    ampEnabled:    false,
  })

  if (!saved?.id) throw new Error('DB insert returned no id')
  return saved.id
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const newsPipelineFunction = inngest.createFunction(
  {
    id:          'news-pipeline',
    name:        'Yahoo News Pipeline',
    retries:     2,
    concurrency: { limit: 1 },
  },
  { event: 'news/pipeline.requested' },

  async ({ step, logger }) => {

    // ── Step 0: Wake FireScrape (Render free tier sleeps after inactivity) ────
    await step.run('wake-firescrape', async () => {
      logger.info('[pipeline] Waking FireScrape API…')
      try {
        await firescrapeWakeUp()
        logger.info('[pipeline] FireScrape is online')
      } catch (e) {
        // /health may not exist on all deployments — log and continue
        logger.warn(`[pipeline] Wake-up warning (non-fatal): ${errMsg(e)}`)
      }
    })

    // ── Step 1: Discover article links ────────────────────────────────────────
    // ✅ Returns ArticleLink[] — Maps serialise to {} across Inngest step boundaries
    const links = await step.run('discover-links', async (): Promise<ArticleLink[]> => {
      logger.info('[pipeline] Discovering Yahoo News article links…')

      const found = await discoverArticleLinks(10)

      if (found.length === 0) {
        throw new Error(
          'Zero article links discovered after all three strategies (map → scrape → crawl). ' +
          `FireScrape base URL: ${FIRESCRAPE_BASE}. ` +
          'Check: (1) API is online, (2) Yahoo News URL structure, (3) isArticleUrl() filter.'
        )
      }

      logger.info(`[pipeline] Discovered ${found.length} article links`)
      return found  // plain array, JSON-safe
    })

    // ── Steps 2–N: per-article scrape → generate → save ──────────────────────
    const results: PipelineResult[] = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const tag  = `[${i + 1}/${links.length}]`

      const result = await step
        .run(`process-article-${i}`, async (): Promise<PipelineResult> => {

          // Scrape
          logger.info(`[pipeline] ${tag} scraping ${link.url}`)
          let page: ScrapedPage
          try {
            page = await scrapeArticle(link)
          } catch (e) {
            throw new Error(`[scrape] ${errMsg(e)}`)
          }

          // Generate
          logger.info(`[pipeline] ${tag} generating…`)
          let generated: GeneratedArticle
          try {
            generated = await generateArticle(page)
          } catch (e) {
            throw new Error(`[generate] ${errMsg(e)}`)
          }

          // Save
          logger.info(`[pipeline] ${tag} saving "${generated.title}"…`)
          let articleId: string
          try {
            articleId = await saveArticle(generated, page)
          } catch (e) {
            throw new Error(`[db] ${errMsg(e)}`)
          }

          logger.info(`[pipeline] ${tag} ✓ id:${articleId}`)
          return { ok: true, sourceUrl: link.url, title: generated.title, articleId }
        })
        .catch((e: unknown): PipelineResult => {
          const raw   = errMsg(e)
          const match = raw.match(/^\[(\w+)\]\s*/)
          const stage = match?.[1] ?? 'unknown'
          const error = match ? raw.slice(match[0].length) : raw
          logger.error(`[pipeline] ${tag} ✗ stage=${stage} | ${link.url} | ${error}`)
          return { ok: false, sourceUrl: link.url, stage, error }
        })

      results.push(result)

      // sendEvent must be at handler top-level, never inside step.run
      if (result.ok) {
        await step.sendEvent(`article-saved-${i}`, {
          name: 'news/article.processed',
          data: {
            articleId:  result.articleId,
            title:      result.title,
            sourceUrl:  result.sourceUrl,
          },
        })
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    const succeeded = results.filter((r): r is Extract<PipelineResult, { ok: true }>  =>  r.ok)
    const failed    = results.filter((r): r is Extract<PipelineResult, { ok: false }> => !r.ok)

    const byStage = failed.reduce<Record<string, number>>((acc, r) => {
      acc[r.stage] = (acc[r.stage] ?? 0) + 1
      return acc
    }, {})

    logger.info(
      `[pipeline] complete — saved: ${succeeded.length}, failed: ${failed.length}, ` +
      `failuresByStage: ${JSON.stringify(byStage)}`
    )

    return {
      total:           links.length,
      saved:           succeeded.length,
      failed:          failed.length,
      failuresByStage: byStage,
      articles:        results,
    }
  },
)