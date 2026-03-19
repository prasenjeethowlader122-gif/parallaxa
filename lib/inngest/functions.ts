/**
 * lib/inngest/functions.ts
 *
 * Yahoo News → FireScrape → HuggingFace → Neon pipeline.
 *
 * KEY FIX: step.fetch / step.sleep must NEVER be called inside step.run().
 * They must be called at the top level of the handler function.
 *
 * Rules:
 *   - step.run()   → use plain fetch() inside, for retryable DB / AI calls
 *   - step.fetch() → use at handler top level, for retryable HTTP calls
 *   - step.sleep() → use at handler top level, for delays between polls
 */

import { inngest } from './client'
import { OpenAI } from 'openai'
import { createArticle } from '@/lib/db/articles'
import type { GetFunctionInput } from 'inngest'

// ─── Constants ────────────────────────────────────────────────────────────────

const FIRESCRAPE_BASE = process.env.FIRESCRAPE_BASE_URL ?? 'https://parallaxa-py-1.onrender.com'
const HF_MODEL        = process.env.HF_MODEL            ?? 'Qwen/Qwen2.5-72B-Instruct'

/**
 * Embedding model served via HuggingFace router.
 * BAAI/bge-large-en-v1.5 produces 1024-dim vectors and ranks among the
 * strongest general-purpose English embedding models on MTEB.
 * Swap for "sentence-transformers/all-MiniLM-L6-v2" (384-dim) if you need
 * lower storage cost, or "intfloat/e5-mistral-7b-instruct" for richer
 * semantic capture at higher cost.
 */
const HF_EMBEDDING_MODEL = process.env.HF_EMBEDDING_MODEL ?? 'BAAI/bge-large-en-v1.5'

const YAHOO_SOURCES = [
  'https://www.yahoo.com/news/',
]

// ─── HuggingFace client ───────────────────────────────────────────────────────

const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_API_KEY ?? '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',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleLink {
  url:   string
  title: string | null
}

interface ScrapedPage {
  url:      string
  title:    string | null
  markdown: string
  image:    string | null
}

interface GeneratedArticle {
  title:       string
  description: string
  content:     string
  category:    string
}

/**
 * Embedding text assembled for each article.
 * Stored as a plain string so any downstream tool (pgvector, Pinecone,
 * OpenSearch kNN, BM25 hybrid search) can re-embed with its own model.
 *
 * Fields:
 *  - text      → the canonical string to embed / index
 *  - vector    → float32 embedding from HF (undefined if generation failed)
 *  - model     → which model produced the vector (for versioning)
 *  - articleId → FK back to the saved article row
 */
export interface ArticleEmbeddingPayload {
  articleId: string
  text:      string
  vector:    number[] | undefined
  model:     string
  dim:       number | undefined
}

interface FireScrapeMetadata {
  title?:          string
  og_image?:       string
  og_title?:       string
  og_description?: string
  description?:    string
  [key: string]:   unknown
}

interface FireScrapeScrapeResult {
  markdown?: string
  text?:     string
  links?:    string[]
  metadata?: FireScrapeMetadata
  error?:    string
  success?:  boolean
}

interface FireScrapeCrawlJob {
  job_id: string
}

interface FireScrapeCrawlStatus {
  status:   'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  results?: FireScrapeScrapeResult[]
  pages?:   FireScrapeScrapeResult[]
}

// FIX: Added embedding payload to the success result so it's accessible
// outside step.run for the sendEvent call.
type PipelineResult =
  | { ok: true;  sourceUrl: string; title: string; articleId: string; embeddingPayload: ArticleEmbeddingPayload }
  | { ok: false; sourceUrl: string; stage: string; error: string }

type InngestStep = GetFunctionInput<typeof inngest>['step']

// ─── Utilities ────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function isArticleUrl(raw: string): boolean {
  let u: URL
  try { u = new URL(raw) } catch { return false }

  // Must be exactly www.yahoo.com
  if (u.hostname !== 'www.yahoo.com') return false

  // Path must match /news/articles/<slug>.html exactly
  const match = u.pathname.match(/^\/news\/articles\/([^/]+)\.html$/)
  if (!match) return false

  return true
}

// ─── FireScrape helpers (use step.fetch — call at handler top level only) ─────

async function firescrapeWakeUp(step: InngestStep): Promise<void> {
  try {
    const res = await step.fetch('wake-firescrape-health', `${FIRESCRAPE_BASE}/health`)
    if (!res.ok) throw new Error(`FireScrape health check HTTP ${res.status}`)
  } catch (e) {
    console.warn(`[wake-up] non-fatal: ${errMsg(e)}`)
  }
}

// ─── FireScrape Map types ─────────────────────────────────────────────────────

interface FireScrapeMapJob {
  job_id: string
}

interface FireScrapeMapStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  urls?:  string[]
  total?: number
}

// /v1/map is a long-running operation (can take 30–120s for large sites).
// Strategy:
//   1. POST /v1/map  → get job_id  (step.fetch — retryable HTTP call)
//   2. Poll GET /v1/map/{job_id} with step.sleep + step.fetch until
//      status === 'completed' or we exhaust MAX_POLLS.
//
// This mirrors exactly how firescrapeCrawl works and ensures Inngest
// never times out waiting on a single blocking HTTP request.
async function firescrapeMap(
  step: InngestStep,
  url: string,
  mapIndex: number,
  maxPages = 60,
): Promise<string[]> {
  // Step 1 — start the map job
  const startRes = await step.fetch(
    `firescrape-map-start-${mapIndex}`,
    `${FIRESCRAPE_BASE}/v1/map`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url,
        include_sitemap: false,
        max_pages:       100,
        same_domain:     true,
      }),
    },
  )

  if (!startRes.ok) {
    throw new Error(`/v1/map start HTTP ${startRes.status}: ${await startRes.text().catch(() => startRes.statusText)}`)
  }

  const startData = await startRes.json() as FireScrapeMapJob | FireScrapeMapStatus

  // FireScrape may return URLs immediately if the result is already cached
  // or if the implementation is synchronous — handle both cases.
  if ('urls' in startData && Array.isArray(startData.urls)) {
    console.log(`[map] immediate response — ${startData.urls.length} URLs`)
    return (startData.urls as unknown[]).filter((u): u is string => typeof u === 'string')
  }

  // Step 2 — poll until completed
  const { job_id } = startData as FireScrapeMapJob
  if (!job_id) {
    throw new Error(`/v1/map returned neither urls nor job_id: ${JSON.stringify(startData).slice(0, 200)}`)
  }

  const MAX_POLLS        = 40          // 40 × 5 s = 200 s max wait
  const POLL_INTERVAL_MS = 5_000

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await step.sleep(`map-poll-wait-${mapIndex}-${poll}`, POLL_INTERVAL_MS)

    const pollRes = await step.fetch(
      `firescrape-map-poll-${mapIndex}-${poll}`,
      `${FIRESCRAPE_BASE}/v1/map/${job_id}`,
    )

    if (!pollRes.ok) {
      console.warn(`[map] poll HTTP ${pollRes.status} for job ${job_id}, retrying…`)
      continue
    }

    const status = await pollRes.json() as FireScrapeMapStatus
    console.log(`[map] job ${job_id} → ${status.status} (poll ${poll + 1}/${MAX_POLLS}, urls so far: ${status.urls?.length ?? 0})`)

    if (status.status === 'completed') {
      const urls = (status.urls ?? []).filter((u): u is string => typeof u === 'string')
      console.log(`[map] job ${job_id} completed — ${urls.length} URLs`)
      return urls
    }

    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`Map job ${job_id} ended with status: ${status.status}`)
    }

    // still pending / running — keep polling
  }

  throw new Error(`Map job ${job_id} timed out after ${MAX_POLLS} polls (${MAX_POLLS * POLL_INTERVAL_MS / 1000}s)`)
}

async function firescrapeUrl(
  step: InngestStep,
  url: string,
  stepId: string,
): Promise<FireScrapeScrapeResult> {
  const res = await step.fetch(stepId, `${FIRESCRAPE_BASE}/v1/scrape`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      url,
      formats:           ['markdown', 'metadata', 'links'],
      only_main_content: true,
      timeout:           30_000,
    }),
  })

  if (!res.ok) {
    throw new Error(`/v1/scrape HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }

  return await res.json() as FireScrapeScrapeResult
}

async function firescrapeCrawl(
  step: InngestStep,
  startUrl: string,
  crawlIndex: number,
  maxPages = 20,
  maxDepth = 2,
): Promise<FireScrapeScrapeResult[]> {
  const startRes = await step.fetch(
    `firescrape-crawl-start-${crawlIndex}`,
    `${FIRESCRAPE_BASE}/v1/crawl`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        url:              startUrl,
        max_pages:        maxPages,
        max_depth:        maxDepth,
        same_domain:      true,
        formats:          ['links', 'metadata'],
        include_patterns: ['.*/news/.*'],
      }),
    },
  )

  if (!startRes.ok) {
    throw new Error(`/v1/crawl start HTTP ${startRes.status}: ${await startRes.text().catch(() => startRes.statusText)}`)
  }

  const { job_id } = await startRes.json() as FireScrapeCrawlJob
  if (!job_id) throw new Error('/v1/crawl returned no job_id')

  const MAX_POLLS        = 30
  const POLL_INTERVAL_MS = 4_000

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    await step.sleep(`crawl-poll-wait-${crawlIndex}-${poll}`, POLL_INTERVAL_MS)

    const pollRes = await step.fetch(
      `firescrape-crawl-poll-${crawlIndex}-${poll}`,
      `${FIRESCRAPE_BASE}/v1/crawl/${job_id}`,
    )

    if (!pollRes.ok) {
      console.warn(`[crawl] poll HTTP ${pollRes.status} for job ${job_id}, retrying…`)
      continue
    }

    const status = await pollRes.json() as FireScrapeCrawlStatus
    console.log(`[crawl] job ${job_id} → ${status.status} (poll ${poll + 1}/${MAX_POLLS})`)

    if (status.status === 'completed')                                return status.results ?? status.pages ?? []
    if (status.status === 'failed' || status.status === 'cancelled') throw new Error(`Crawl job ${job_id} ended with status: ${status.status}`)
  }

  throw new Error(`Crawl job ${job_id} timed out after ${MAX_POLLS} polls`)
}

// ─── Link discovery ───────────────────────────────────────────────────────────

async function discoverArticleLinks(
  step: InngestStep,
  limit: number,
): Promise<ArticleLink[]> {
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
  for (let i = 0; i < YAHOO_SOURCES.length; i++) {
    if (links.length > limit) break
    try {
      console.log(`[discover] A: map ${YAHOO_SOURCES[i]}`)
      const urls = await firescrapeMap(step, YAHOO_SOURCES[i], i, 60)
      console.log(`[discover] A: map returned ${urls.length} raw URLs`)
      urls.forEach((u) => add(u))
      console.log(`[discover] A: running total ${links.length}`)
    } catch (e) {
      console.warn(`[discover] A: map failed for ${YAHOO_SOURCES[i]}: ${errMsg(e)}`)
    }
  }

  // Strategy B: scrape + extract links
  if (links.length < limit) {
    for (let i = 0; i < YAHOO_SOURCES.length; i++) {
      if (links.length > limit) break
      try {
        console.log(`[discover] B: scrape-links ${YAHOO_SOURCES[i]}`)
        const result = await firescrapeUrl(step, YAHOO_SOURCES[i], `discover-scrape-${i}`)
        const raw    = result.links ?? []
        console.log(`[discover] B: got ${raw.length} links from ${YAHOO_SOURCES[i]}`)
        raw.forEach((u) => add(u))
        console.log(`[discover] B: running total ${links.length}`)
      } catch (e) {
        console.warn(`[discover] B: scrape failed for ${YAHOO_SOURCES[i]}: ${errMsg(e)}`)
      }
    }
  }

  // Strategy C: async crawl
  if (links.length < limit) {
    for (let i = 0; i < YAHOO_SOURCES.length; i++) {
      if (links.length > limit) break
      try {
        console.log(`[discover] C: crawl ${YAHOO_SOURCES[i]}`)
        const pages = await firescrapeCrawl(step, YAHOO_SOURCES[i], i, 20, 2)
        console.log(`[discover] C: crawl returned ${pages.length} pages`)
        pages.forEach((p) => (p.links ?? []).forEach((u) => add(u)))
        console.log(`[discover] C: running total ${links.length}`)
      } catch (e) {
        console.warn(`[discover] C: crawl failed for ${YAHOO_SOURCES[i]}: ${errMsg(e)}`)
      }
    }
  }

  console.log(`[discover] final: ${links.length} unique articles (limit ${limit})`)
  return links.slice(0, limit)
}

// ─── Per-article helpers (plain fetch — safe inside step.run) ─────────────────

async function scrapeArticlePlain(link: ArticleLink): Promise<ScrapedPage> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/scrape`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      url:               link.url,
      formats:           ['markdown', 'metadata', 'links'],
      only_main_content: true,
      timeout:           30_000,
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!res.ok) {
    throw new Error(`/v1/scrape HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }

  const result = await res.json() as FireScrapeScrapeResult

  const markdown = (result.markdown ?? result.text ?? '').trim()
  if (markdown.length < 100) {
    throw new Error(
      `Insufficient content (${markdown.length} chars) — page may be paywalled, ` +
      `redirected, or behind a bot check`,
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

// ─── Generate article via HuggingFace (plain fetch — safe inside step.run) ────

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

// ─── Embedding text assembly ──────────────────────────────────────────────────

function buildEmbeddingText(
  generated: GeneratedArticle,
  page: ScrapedPage,
): string {
  const bodySnippet = generated.content.slice(0, 1_200).trimEnd()

  return [
    'Represent this document for retrieval:',
    `Title: ${generated.title}`,
    `Category: ${generated.category}`,
    `Summary: ${generated.description}`,
    `Body: ${bodySnippet}`,
    `Source: ${page.url}`,
  ].join('\n')
}

// ─── Generate embedding via HuggingFace (plain fetch — safe inside step.run) ──

async function generateEmbedding(text: string): Promise<number[] | undefined> {
  try {
    const response = await hfClient.embeddings.create({
      model: HF_EMBEDDING_MODEL,
      input: text,
    })

    const vector = response.data[0]?.embedding
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Embedding response contained no vector data')
    }

    return vector as number[]
  } catch (e) {
    console.warn(`[embed] embedding generation failed (non-fatal): ${errMsg(e)}`)
    return undefined
  }
}

// ─── Save to Neon (plain DB call — safe inside step.run) ──────────────────────

type ArticleVisibility = 'public' | 'private' | 'unlisted'
type ArticleStatus     = 'published' | 'draft' | 'archived'

async function saveArticle(generated: GeneratedArticle, page: ScrapedPage): Promise<string> {
  const wordCount = generated.content.split(/\s+/).length
  const readTime  = Math.max(1, Math.ceil(wordCount / 200))

  const visibility: ArticleVisibility = 'public'
  const status: ArticleStatus         = 'published'

  const saved = await createArticle({
    title:         generated.title,
    description:   generated.description,
    content:       generated.content,
    category:      generated.category,
    author:        'Intelligence',
    date:          new Date(),
    image:         page.image ?? '',
    readTime,
    featured:      false,
    breaking:      false,
    trending:      false,
    ogImage:       page.image ?? undefined,
    twitterCard:   'summary_large_image',
    visibility,
    status,
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
    id:          'news-pipeline-yzo07',
    name:        'Yahoo News Pipeline',
    retries:     3,
    concurrency: { limit: 1 },
    triggers:    [{ event: 'news/pipeline.requested' }],
  },

  async ({ step, logger }) => {

    // ── Step 0: Wake FireScrape ───────────────────────────────────────────────
    logger.info('[pipeline] Waking FireScrape API…')
    await firescrapeWakeUp(step)
    logger.info('[pipeline] FireScrape wake-up complete')

    // ── Step 1: Discover article links ────────────────────────────────────────
    logger.info('[pipeline] Discovering Yahoo News article links…')
    let links = await discoverArticleLinks(step, 50)

    if (links.length === 0) {
      links = [
        {
          url : 'https://www.yahoo.com/news/us/article/nancy-guthries-disappearance-former-fbi-special-agent-says-it-appears-less-and-less-lik',
          title: null
        }
      ]
    }
    

    logger.info(`[pipeline] Discovered ${links.length} article links`)

    // ── Steps 2–N: per-article scrape → generate → save → embed ──────────────
    const results: PipelineResult[] = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const tag  = `[${i + 1}/${links.length}]`

      const result = await step
        .run(`process-article-${i}`, async (): Promise<PipelineResult> => {

          // 1. Scrape
          logger.info(`[pipeline] ${tag} scraping ${link.url}`)
          let page: ScrapedPage
          try {
            page = await scrapeArticlePlain(link)
          } catch (e) {
            throw new Error(`[scrape] ${errMsg(e)}`)
          }

          // 2. Generate
          logger.info(`[pipeline] ${tag} generating…`)
          let generated: GeneratedArticle
          try {
            generated = await generateArticle(page)
          } catch (e) {
            throw new Error(`[generate] ${errMsg(e)}`)
          }

          // 3. Save to DB
          // FIX: articleId is declared here, before it is used below.
          logger.info(`[pipeline] ${tag} saving "${generated.title}"…`)
          let articleId: string
          try {
            articleId = await saveArticle(generated, page)
          } catch (e) {
            throw new Error(`[db] ${errMsg(e)}`)
          }

          // 4. Build embedding text + generate vector
          //    Non-fatal: article is already saved; a failed embed won't
          //    roll back the DB insert.
          logger.info(`[pipeline] ${tag} building embedding…`)
          const embeddingText   = buildEmbeddingText(generated, page)
          const embeddingVector = await generateEmbedding(embeddingText)

          // FIX: articleId is now guaranteed to be assigned before this point.
          const embeddingPayload: ArticleEmbeddingPayload = {
            articleId,
            text:   embeddingText,
            vector: embeddingVector,
            model:  HF_EMBEDDING_MODEL,
            dim:    embeddingVector?.length,
          }

          if (embeddingVector) {
            logger.info(`[pipeline] ${tag} embedding OK — dim=${embeddingVector.length}`)
          } else {
            logger.warn(`[pipeline] ${tag} embedding skipped — will need re-embedding`)
          }

          logger.info(`[pipeline] ${tag} ✓ id:${articleId}`)

          // FIX: Return embeddingPayload as part of the result so the
          // sendEvent call outside step.run can include it without
          // recomputing or accessing out-of-scope variables.
          return { ok: true, sourceUrl: link.url, title: generated.title, articleId, embeddingPayload }
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

      if (result.ok) {
        await step.sendEvent(`article-saved-${i}`, {
          name: 'news/article.processed',
          data: {
            articleId:       result.articleId,
            title:           result.title,
            sourceUrl:       result.sourceUrl,
            // FIX: embeddingPayload now comes directly from the step.run
            // return value — no variable scope issues.
            embeddingPayload: result.embeddingPayload,
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
      `failuresByStage: ${JSON.stringify(byStage)}`,
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