/**
 * lib/inngest/functions.ts
 * Yahoo News → FireScrape → HuggingFace → Neon pipeline.
 *
 * Duplicate detection — 3 layers (fastest → most thorough):
 *   Layer 1 — source_url exact match   (before scrape — cheapest)
 *   Layer 2 — title exact match        (after generate)
 *   Layer 3 — pgvector cosine distance (after embed)
 *
 * Inngest step rules (enforced throughout):
 *   step.fetch / step.sleep  → top-level handler only  (retryable HTTP / delays)
 *   step.run                 → DB, AI, CPU-bound work   (plain fetch() inside)
 *   step.sendEvent           → top-level handler only
 */

import { inngest } from './client'
import { OpenAI } from 'openai'
import {
  createArticle,
  getArticleBySourceUrl,
  getArticleByTitle,
  searchArticlesByVector,
} from '@/lib/db/articles'
import type { GetFunctionInput } from 'inngest'

// ─── Config ───────────────────────────────────────────────────────────────────

const FS_BASE        = process.env.FIRESCRAPE_BASE_URL  ?? 'https://parallaxa-py-1.onrender.com'
const HF_MODEL       = process.env.HF_MODEL             ?? 'nvidia/nemotron-3-super-120b-a12b:free'
const HF_EMBED_MODEL = process.env.HF_EMBEDDING_MODEL   ?? 'nvidia/llama-nemotron-embed-vl-1b-v2:free'
const YAHOO_SOURCES  = [//'https://www.yahoo.com/news'
'https://www.thedailystar.net/news'
]
const FALLBACK_URL   = 'https://www.yahoo.com/news/articles/law-bondi-says-dems-storm-061908312.html'

/**
 * Cosine-distance threshold for vector duplicate detection.
 * 0.15 = very similar  |  0.20 = similar  |  0.25 = same topic different angle
 * Lower = stricter (fewer false-positives, more duplicates slip through).
 */
const VECTOR_DUPLICATE_THRESHOLD = 0.15

const hf = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.HF_API_KEY ?? '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',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleLink { url: string; title: string | null }
export interface ArticleEmbeddingPayload {
  articleId: string; text: string; vector: number[] | undefined; model: string; dim: number | undefined
}

interface ScrapedPage { url: string; title: string | null; markdown: string; image: string | null }

interface GeneratedArticle {
  title: string
  description: string
  content: string
  category: string
  embedding?: number[]   // ✅ attached before save
}

interface FsMeta { title?: string; og_image?: string; [k: string]: unknown }
interface FsScrape { markdown?: string; text?: string; links?: string[]; metadata?: FsMeta }
interface FsJob { job_id: string }
interface FsMapStatus { status: string; urls?: string[] }
interface FsCrawlStatus { status: string; results?: FsScrape[]; pages?: FsScrape[] }

type PipelineResult =
  | { ok: true;  sourceUrl: string; title: string; articleId: string; embeddingPayload: ArticleEmbeddingPayload }
  | { ok: false; sourceUrl: string; stage: string; error: string }

type Step = GetFunctionInput<typeof inngest>['step']

// ─── Utilities ────────────────────────────────────────────────────────────────

const errMsg = (e: unknown) => e instanceof Error ? e.message : String(e)

function isArticleUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    
    const isYahoo =
      u.hostname === 'www.yahoo.com' &&
      /^\/news\/articles\/[^/]+\.html$/.test(u.pathname)
    
    const isBBC =
      u.hostname === 'www.bbc.com' &&
      /^\/[^/]+\/articles\/[^/]+(?:\.lite)?$/.test(u.pathname)
    
    const isDailyStar =
      u.hostname === 'www.thedailystar.net' &&
      /^\/(?:[^/]+\/)+news\/[^/]+-\d+$/.test(u.pathname)
    
    return isYahoo || isBBC || isDailyStar
  } catch { return false }
}

// ─── FireScrape: step.fetch helpers (top-level only) ─────────────────────────

async function fsWakeUp(step: Step): Promise<void> {
  try {
    const r = await step.fetch('wake-firescrape', `${FS_BASE}/health`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  } catch (e) { console.warn(`[wake] non-fatal: ${errMsg(e)}`) }
}

// ─── Plain-fetch helpers (safe inside step.run) ───────────────────────────────

async function discoverLinksPlain(limit: number): Promise<ArticleLink[]> {
  const seen = new Set<string>()
  const out: ArticleLink[] = []

  const add = (url: string, title: string | null = null) => {
    const clean = url.split('?')[0].split('#')[0]
    if (!seen.has(clean) && isArticleUrl(clean)) { seen.add(clean); out.push({ url: clean, title }) }
  }

  for (let i = 0; i < YAHOO_SOURCES.length && out.length < limit; i++) {
    try {
      const r = await fetch(`${FS_BASE}/v1/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: YAHOO_SOURCES[i], include_sitemap: false, max_pages: 60, same_domain: true }),
        signal: AbortSignal.timeout(65_000),
      })
      if (!r.ok) throw new Error(`/v1/map HTTP ${r.status}`)
      const data = await r.json() as FsJob | FsMapStatus
      if ('urls' in data && Array.isArray(data.urls))
        data.urls.filter((u): u is string => typeof u === 'string').forEach(u => add(u))
    } catch (e) { console.warn(`[discover] map[${i}]: ${errMsg(e)}`) }
  }

  return out.slice(0, limit)
}

async function scrape(link: ArticleLink): Promise<ScrapedPage> {
  const r = await fetch(`${FS_BASE}/v1/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: link.url, formats: ['markdown', 'metadata'], only_main_content: true, timeout: 30_000 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!r.ok) throw new Error(`/v1/scrape HTTP ${r.status}`)
  const res = await r.json() as FsScrape
  const md = (res.markdown ?? res.text ?? '').trim()
  if (md.length < 100) throw new Error(`Insufficient content (${md.length} chars)`)
  const meta = res.metadata ?? {}
  return {
    url: link.url,
    title: (meta.title as string) ?? link.title ?? null,
    markdown: md.slice(0, 5_000),
    image: typeof meta.og_image === 'string' ? meta.og_image : null,
  }
}

const SYSTEM_PROMPT = `You are a professional news journalist.
Write a full news article based ONLY on the provided source material.
Respond with ONLY a valid JSON object — no markdown fences, no preamble:
{"title":"<headline>","description":"<2-sentence summary>","content":"<4-5 paragraph body , add [[text]] for every important keywords like names place country etc>","category":"<Business|Technology|Sports|Entertainment|Science|Health|World>"}`

async function generate(page: ScrapedPage): Promise<GeneratedArticle> {
  const res = await hf.chat.completions.create({
    model: HF_MODEL,
    stream: false,
    max_tokens: 1_200,
    temperature: 0.6,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Source: ${page.url}\n\n${page.markdown}` },
    ],
  })
  const raw = res.choices[0]?.message?.content ?? ''
  if (!raw.trim()) throw new Error('Empty model response')
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let p: Record<string, unknown>
  try { p = JSON.parse(clean) } catch { throw new Error(`Invalid JSON: ${raw.slice(0, 400)}`) }
  const title = String(p.title ?? page.title ?? 'Untitled').trim()
  const content = String(p.content ?? '').trim()
  if (!title || !content) throw new Error(`Missing title/content. Keys: ${Object.keys(p).join(', ')}`)
  return {
    title,
    description: String(p.description ?? '').trim(),
    content,
    
    category: String(p.category ?? 'World').trim(),
  }
}

async function embed(text: string): Promise<number[] | undefined> {
  try {
    const r = await hf.embeddings.create({ model: HF_EMBED_MODEL, input: text })
    const v = r.data[0]?.embedding
    if (!Array.isArray(v) || !v.length) throw new Error('No vector data')
    return v as number[]
  } catch (e) { console.warn(`[embed] non-fatal: ${errMsg(e)}`); return undefined }
}

function buildEmbedText(gen: GeneratedArticle, page: ScrapedPage): string {
  return [
    'Represent this document for retrieval:',
    `Title: ${gen.title}`,
    `Category: ${gen.category}`,
    `Summary: ${gen.description}`,
    `Body: ${gen.content.slice(0, 1_200).trimEnd()}`,
    `Source: ${page.url}`,
  ].join('\n')
}

async function saveArticle(gen: GeneratedArticle, page: ScrapedPage): Promise<string> {
  console.log('[saveArticle] embedding present:', !!gen.embedding, 'length:', gen.embedding?.length)
  const readTime = Math.max(1, Math.ceil(gen.content.split(/\s+/).length / 200))
  const saved = await createArticle({
    title: gen.title,
    description: gen.description,
    content: gen.content,
    category: gen.category,
    author: 'Prasenjeet Howlader',
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
    sourceUrl: page.url,        // ✅ save source URL for Layer-1 future checks
    embedding: gen.embedding,   // ✅ already number[] — createArticle converts to pgvector literal
  })
  if (!saved?.id) throw new Error('DB insert returned no id')
  return saved.id
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const newsPipelineFunction = inngest.createFunction(
  {
    id: 'news-pipeline-yzo00r0',
    name: 'Yahoo News Pipeline',
    retries: 3,
    concurrency: { limit: 1 },
    triggers: [{ event: 'news/pipeline.requested' }],
  },

  async ({ step, logger }) => {

    // ── Step 0: Wake FireScrape ─────────────────────────────────────────────
    await firescrapeWakeUp(step)

    // ── Step 1: Discover links ──────────────────────────────────────────────
    const links = await step.run('discover-links', async () => {
      const found = await discoverLinksPlain(30)
      return found.length > 0 ? found : [{ url: FALLBACK_URL, title: null }]
    })

    await step.run('discovery-summary', async () => ({
      total: links.length,
      usedFallback: links.length === 1 && links[0].url === FALLBACK_URL,
      sources: YAHOO_SOURCES,
      links: links.map(l => ({ url: l.url, title: l.title })),
    }))

    // ── Steps 2–N: per-article pipeline ────────────────────────────────────
    const results: PipelineResult[] = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const tag  = `[${i + 1}/${links.length}]`

      const result = await step
        .run(`process-article-${i}`, async (): Promise<PipelineResult> => {

          // ── Layer 1: URL duplicate check (cheapest — before any network call) ──
          const byUrl = await getArticleBySourceUrl(link.url)
          if (byUrl) {
            logger.info(`[pipeline] ${tag} ⏭ duplicate (url) id:${byUrl.id} | ${link.url}`)
            return { ok: false, sourceUrl: link.url, stage: 'duplicate', error: `URL exists: "${byUrl.title}"` }
          }

          // ── Scrape ────────────────────────────────────────────────────────
          let page: ScrapedPage
          try { page = await scrape(link) }
          catch (e) { throw new Error(`[scrape] ${errMsg(e)}`) }

          // ── Generate ──────────────────────────────────────────────────────
          let gen: GeneratedArticle
          try { gen = await generate(page) }
          catch (e) { throw new Error(`[generate] ${errMsg(e)}`) }

          // ── Layer 2: Title duplicate check ────────────────────────────────
          const byTitle = await getArticleByTitle(gen.title)
          if (byTitle) {
            logger.info(`[pipeline] ${tag} ⏭ duplicate (title) id:${byTitle.id} | "${gen.title}"`)
            return { ok: false, sourceUrl: link.url, stage: 'duplicate', error: `Title exists: "${byTitle.title}"` }
          }

          // ── Embed ─────────────────────────────────────────────────────────
          const embedText   = buildEmbedText(gen, page)
          const embedVector = await embed(embedText)

          // ── Layer 3: Vector similarity duplicate check ────────────────────
          if (embedVector) {
            const similar = await searchArticlesByVector(
              embedVector,
              1,                          // only need the closest match
              VECTOR_DUPLICATE_THRESHOLD,
            )
            if (similar.length > 0) {
              logger.info(
                `[pipeline] ${tag} ⏭ duplicate (vector) id:${similar[0].id} dist<${VECTOR_DUPLICATE_THRESHOLD} | "${similar[0].title}"`
              )
              return {
                ok: false,
                sourceUrl: link.url,
                stage: 'duplicate',
                error: `Too similar to: "${similar[0].title}"`,
              }
            }
          } else {
            // embed failed — log but continue (don't block saves when HF times out)
            logger.warn(`[pipeline] ${tag} ⚠ embedding failed — skipping vector duplicate check`)
          }

          // ── All checks passed — save ──────────────────────────────────────
          gen.embedding = embedVector

          let articleId: string
          try { articleId = await saveArticle(gen, page) }
          catch (e) { throw new Error(`[db] ${errMsg(e)}`) }

          const embeddingPayload: ArticleEmbeddingPayload = {
            articleId,
            text: embedText,
            vector: embedVector,
            model: HF_EMBED_MODEL,
            dim: embedVector?.length,
          }

          logger.info(`[pipeline] ${tag} ✓ id:${articleId} embed_dim:${embedVector?.length ?? 'none'}`)
          return { ok: true, sourceUrl: link.url, title: gen.title, articleId, embeddingPayload }
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
            articleId: result.articleId,
            title: result.title,
            sourceUrl: result.sourceUrl,
            embeddingPayload: result.embeddingPayload,
          },
        })
      }
    }

    // ── Final summary ───────────────────────────────────────────────────────
    const ok         = results.filter((r): r is Extract<PipelineResult, { ok: true }>  => r.ok)
    const failed     = results.filter((r): r is Extract<PipelineResult, { ok: false }> => !r.ok)
    const duplicates = failed.filter(r => r.stage === 'duplicate')
    const errors     = failed.filter(r => r.stage !== 'duplicate')

    const byStage = failed.reduce<Record<string, number>>((acc, r) => {
      acc[r.stage] = (acc[r.stage] ?? 0) + 1; return acc
    }, {})

    logger.info(
      `[pipeline] done — saved:${ok.length} skipped(dup):${duplicates.length} failed:${errors.length} | byStage:${JSON.stringify(byStage)}`
    )

    return {
      total: links.length,
      saved: ok.length,
      skipped: duplicates.length,
      failed: errors.length,
      failuresByStage: byStage,
      articles: results,
    }
  },
)

// ─── Re-export wake-up under old name ────────────────────────────────────────
async function firescrapeWakeUp(step: Step): Promise<void> { await fsWakeUp(step) }