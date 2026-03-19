/**
 * lib/inngest/functions.ts
 * Yahoo News → FireScrape → HuggingFace → Neon pipeline.
 *
 * Inngest step rules (enforced throughout):
 *   step.fetch / step.sleep  → top-level handler only  (retryable HTTP / delays)
 *   step.run                 → DB, AI, CPU-bound work   (plain fetch() inside)
 *   step.sendEvent           → top-level handler only
 */

import { inngest } from './client'
import { OpenAI }  from 'openai'
import { createArticle } from '@/lib/db/articles'
import type { GetFunctionInput } from 'inngest'

// ─── Config ───────────────────────────────────────────────────────────────────

const FS_BASE        = process.env.FIRESCRAPE_BASE_URL    ?? 'https://parallaxa-py-1.onrender.com'
const HF_MODEL       = process.env.HF_MODEL               ?? 'Qwen/Qwen2.5-72B-Instruct'
const HF_EMBED_MODEL = process.env.HF_EMBEDDING_MODEL     ?? 'BAAI/bge-large-en-v1.5'
const YAHOO_SOURCES  = ['https://www.yahoo.com/news/']
const FALLBACK_URL   = 'https://www.yahoo.com/news/articles/law-bondi-says-dems-storm-061908312.html'

const hf = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey:  process.env.HF_API_KEY ?? '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',
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleLink           { url: string; title: string | null }
export interface ArticleEmbeddingPayload {
  articleId: string; text: string; vector: number[] | undefined; model: string; dim: number | undefined
}

interface ScrapedPage      { url: string; title: string | null; markdown: string; image: string | null }
interface GeneratedArticle { title: string; description: string; content: string; category: string }

interface FsMeta   { title?: string; og_image?: string; [k: string]: unknown }
interface FsScrape { markdown?: string; text?: string; links?: string[]; metadata?: FsMeta }
interface FsJob    { job_id: string }
interface FsMapStatus   { status: string; urls?: string[] }
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
    return u.hostname === 'www.yahoo.com' && /^\/news\/articles\/[^/]+\.html$/.test(u.pathname)
  } catch { return false }
}

// ─── FireScrape: step.fetch helpers (top-level only) ─────────────────────────

async function fsWakeUp(step: Step): Promise<void> {
  try {
    const r = await step.fetch('wake-firescrape', `${FS_BASE}/health`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  } catch (e) { console.warn(`[wake] non-fatal: ${errMsg(e)}`) }
}

async function fsMap(step: Step, url: string, idx: number): Promise<string[]> {
  const r = await step.fetch(`fs-map-start-${idx}`, `${FS_BASE}/v1/map`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, include_sitemap: false, max_pages: 100, same_domain: true }),
  })
  if (!r.ok) throw new Error(`/v1/map HTTP ${r.status}`)

  const data = await r.json() as FsJob | FsMapStatus
  if ('urls' in data && Array.isArray(data.urls)) return data.urls.filter((u): u is string => typeof u === 'string')

  const { job_id } = data as FsJob
  if (!job_id) throw new Error(`/v1/map no job_id: ${JSON.stringify(data).slice(0, 200)}`)

  for (let p = 0; p < 40; p++) {
    await step.sleep(`fs-map-wait-${idx}-${p}`, 5_000)
    const pr = await step.fetch(`fs-map-poll-${idx}-${p}`, `${FS_BASE}/v1/map/${job_id}`)
    if (!pr.ok) { console.warn(`[map] poll HTTP ${pr.status}`); continue }
    const s = await pr.json() as FsMapStatus
    if (s.status === 'completed') return (s.urls ?? []).filter((u): u is string => typeof u === 'string')
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`map job ${job_id}: ${s.status}`)
  }
  throw new Error(`map job ${job_id} timed out`)
}

async function fsScrapeLinks(step: Step, url: string, id: string): Promise<string[]> {
  const r = await step.fetch(id, `${FS_BASE}/v1/scrape`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['links'], only_main_content: false, timeout: 30_000 }),
  })
  if (!r.ok) throw new Error(`/v1/scrape HTTP ${r.status}`)
  return ((await r.json() as FsScrape).links ?? [])
}

async function fsCrawl(step: Step, url: string, idx: number): Promise<FsScrape[]> {
  const r = await step.fetch(`fs-crawl-start-${idx}`, `${FS_BASE}/v1/crawl`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, max_pages: 20, max_depth: 2, same_domain: true, formats: ['links'], include_patterns: ['.*/news/.*'] }),
  })
  if (!r.ok) throw new Error(`/v1/crawl HTTP ${r.status}`)
  const { job_id } = await r.json() as FsJob
  if (!job_id) throw new Error('/v1/crawl no job_id')

  for (let p = 0; p < 30; p++) {
    await step.sleep(`fs-crawl-wait-${idx}-${p}`, 4_000)
    const pr = await step.fetch(`fs-crawl-poll-${idx}-${p}`, `${FS_BASE}/v1/crawl/${job_id}`)
    if (!pr.ok) { console.warn(`[crawl] poll HTTP ${pr.status}`); continue }
    const s = await pr.json() as FsCrawlStatus
    if (s.status === 'completed') return s.results ?? s.pages ?? []
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error(`crawl ${job_id}: ${s.status}`)
  }
  throw new Error(`crawl ${job_id} timed out`)
}

// ─── Link discovery (calls step.fetch/sleep — top-level only) ────────────────

async function discoverLinks(step: Step, limit: number): Promise<ArticleLink[]> {
  const seen = new Set<string>()
  const out: ArticleLink[] = []

  const add = (url: string, title: string | null = null) => {
    const clean = url.split('?')[0].split('#')[0]
    if (!seen.has(clean) && isArticleUrl(clean)) { seen.add(clean); out.push({ url: clean, title }) }
  }

  for (let i = 0; i < YAHOO_SOURCES.length && out.length < limit; i++) {
    try { (await fsMap(step, YAHOO_SOURCES[i], i)).forEach(u => add(u)) }
    catch (e) { console.warn(`[discover] map[${i}]: ${errMsg(e)}`) }
  }

  for (let i = 0; i < YAHOO_SOURCES.length && out.length < limit; i++) {
    try { (await fsScrapeLinks(step, YAHOO_SOURCES[i], `discover-scrape-${i}`)).forEach(u => add(u)) }
    catch (e) { console.warn(`[discover] scrape[${i}]: ${errMsg(e)}`) }
  }

  for (let i = 0; i < YAHOO_SOURCES.length && out.length < limit; i++) {
    try { (await fsCrawl(step, YAHOO_SOURCES[i], i)).forEach(p => (p.links ?? []).forEach(u => add(u))) }
    catch (e) { console.warn(`[discover] crawl[${i}]: ${errMsg(e)}`) }
  }

  return out.slice(0, limit)
}

// ─── Per-article: plain fetch (safe inside step.run) ─────────────────────────

async function scrape(link: ArticleLink): Promise<ScrapedPage> {
  const r = await fetch(`${FS_BASE}/v1/scrape`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: link.url, formats: ['markdown', 'metadata'], only_main_content: true, timeout: 30_000 }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!r.ok) throw new Error(`/v1/scrape HTTP ${r.status}`)
  const res = await r.json() as FsScrape
  const md = (res.markdown ?? res.text ?? '').trim()
  if (md.length < 100) throw new Error(`Insufficient content (${md.length} chars)`)
  const meta = res.metadata ?? {}
  return {
    url:      link.url,
    title:    (meta.title as string) ?? link.title ?? null,
    markdown: md.slice(0, 5_000),
    image:    typeof meta.og_image === 'string' ? meta.og_image : null,
  }
}

const SYSTEM_PROMPT = `You are a professional news journalist.
Write a full news article based ONLY on the provided source material.
Respond with ONLY a valid JSON object — no markdown fences, no preamble:
{"title":"<headline>","description":"<2-sentence summary>","content":"<4-5 paragraph body>","category":"<Business|Technology|Sports|Entertainment|Science|Health|World>"}`

async function generate(page: ScrapedPage): Promise<GeneratedArticle> {
  const res = await hf.chat.completions.create({
    model: HF_MODEL, stream: false, max_tokens: 1_200, temperature: 0.6,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Source: ${page.url}\n\n${page.markdown}` },
    ],
  })
  const raw = res.choices[0]?.message?.content ?? ''
  if (!raw.trim()) throw new Error('Empty model response')
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let p: Record<string, unknown>
  try { p = JSON.parse(clean) } catch { throw new Error(`Invalid JSON: ${raw.slice(0, 400)}`) }
  const title   = String(p.title   ?? page.title ?? 'Untitled').trim()
  const content = String(p.content ?? '').trim()
  if (!title || !content) throw new Error(`Missing title/content. Keys: ${Object.keys(p).join(', ')}`)
  return { title, description: String(p.description ?? '').trim(), content, category: String(p.category ?? 'World').trim() }
}

async function embed(text: string): Promise<number[] | undefined> {
  try {
    const r = await hf.embeddings.create({ model: HF_EMBED_MODEL, input: text })
    const v = r.data[0]?.embedding
    if (!Array.isArray(v) || !v.length) throw new Error('No vector data')
    return v as number[]
  } catch (e) { console.warn(`[embed] non-fatal: ${errMsg(e)}`); return undefined }
}

async function saveArticle(gen: GeneratedArticle, page: ScrapedPage): Promise<string> {
  const readTime = Math.max(1, Math.ceil(gen.content.split(/\s+/).length / 200))
  const saved = await createArticle({
    title: gen.title, description: gen.description, content: gen.content,
    category: gen.category, author: 'Intelligence', date: new Date(),
    image: page.image ?? '', readTime,
    featured: false, breaking: false, trending: false,
    ogImage: page.image ?? undefined, twitterCard: 'summary_large_image',
    visibility: 'public', status: 'published',
    noIndex: false, allowComments: true, showInRss: true, ampEnabled: false,
  })
  if (!saved?.id) throw new Error('DB insert returned no id')
  return saved.id
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

// ─── Inngest function ─────────────────────────────────────────────────────────

export const newsPipelineFunction = inngest.createFunction(
  {
    id: 'news-pipeline-yzo007p', name: 'Yahoo News Pipeline',
    retries: 3, concurrency: { limit: 1 },
    triggers: [{ event: 'news/pipeline.requested' }],
  },

  async ({ step, logger }) => {

    // ── Step 0: Wake FireScrape ───────────────────────────────────────────────
    await firescrapeWakeUp(step)

    // ── Step 1: Discover links (step.fetch/sleep calls — top-level) ───────────
    logger.info('[pipeline] Discovering links…')
    const rawLinks = await discoverLinks(step, 50)
    const links    = rawLinks.length > 0 ? rawLinks : [{ url: FALLBACK_URL, title: null }]

    // Snapshot discovery results as a named step → visible in Inngest dashboard
    await step.run('discovery-summary', async () => ({
      total:        links.length,
      usedFallback: rawLinks.length === 0,
      sources:      YAHOO_SOURCES,
      links:        links.map(l => ({ url: l.url, title: l.title })),
    }))

    logger.info(`[pipeline] ${links.length} links (fallback=${rawLinks.length === 0})`)

    // ── Steps 2–N: scrape → generate → save → embed ───────────────────────────
    const results: PipelineResult[] = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const tag  = `[${i + 1}/${links.length}]`

      const result = await step
        .run(`process-article-${i}`, async (): Promise<PipelineResult> => {
          let page: ScrapedPage
          try { page = await scrape(link) }
          catch (e) { throw new Error(`[scrape] ${errMsg(e)}`) }

          let gen: GeneratedArticle
          try { gen = await generate(page) }
          catch (e) { throw new Error(`[generate] ${errMsg(e)}`) }

          let articleId: string
          try { articleId = await saveArticle(gen, page) }
          catch (e) { throw new Error(`[db] ${errMsg(e)}`) }

          const embedText    = buildEmbedText(gen, page)
          const embedVector  = await embed(embedText)
          const embeddingPayload: ArticleEmbeddingPayload = {
            articleId, text: embedText, vector: embedVector,
            model: HF_EMBED_MODEL, dim: embedVector?.length,
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
            articleId:        result.articleId,
            title:            result.title,
            sourceUrl:        result.sourceUrl,
            embeddingPayload: result.embeddingPayload,
          },
        })
      }
    }

    // ── Final summary ─────────────────────────────────────────────────────────
    const ok     = results.filter((r): r is Extract<PipelineResult, { ok: true  }>  =>  r.ok)
    const failed = results.filter((r): r is Extract<PipelineResult, { ok: false }> => !r.ok)
    const byStage = failed.reduce<Record<string, number>>((acc, r) => {
      acc[r.stage] = (acc[r.stage] ?? 0) + 1; return acc
    }, {})

    logger.info(`[pipeline] done — saved:${ok.length} failed:${failed.length} byStage:${JSON.stringify(byStage)}`)

    return { total: links.length, saved: ok.length, failed: failed.length, failuresByStage: byStage, articles: results }
  },
)

// ─── Re-export wake-up under old name (used by firescrapeWakeUp callers) ──────
async function firescrapeWakeUp(step: Step): Promise<void> { await fsWakeUp(step) }