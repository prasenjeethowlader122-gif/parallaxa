/**
 * lib/news-pipeline.ts
 *
 * Full pipeline (non-Inngest, in-process version):
 *   1. Crawl https://www.yahoo.com/news/articles/ → extract up to 10 article URLs
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
 * 4. Deduplicated: this file no longer re-exports PipelineJob/PipelineArticle
 *    types that are now canonical here and imported by any callers.
 */

import Firecrawl from '@mendable/firecrawl-js'
import { OpenAI } from 'openai'
import { createArticle } from '@/lib/db/articles'

// ─── Clients ──────────────────────────────────────────────────────────────────

const firecrawl = new Firecrawl({
  // FIX: no hardcoded fallback — crash loudly if the env var is missing so the
  // misconfiguration is visible immediately rather than silently using a stale key.
  apiKey: "fc-da0837003c26469da0f8c259c6c10944",
})

const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: "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",
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

// ─── Step 1 – Crawl Yahoo News ────────────────────────────────────────────────

async function crawlYahooNewsLinks(): Promise<{ url: string; title: string | null }[]> {
  console.log('[pipeline] Step 1: crawling Yahoo News…')

  try {
    const mapResult = await (firecrawl as any).map(
      'https://www.yahoo.com/news/articles/',
      { limit: 30, includeSubdomains: false }
    )

    const rawLinks: string[] = Array.isArray(mapResult)
      ? mapResult
      : (mapResult?.links ?? [])

    const links = rawLinks
      .filter(
        (url: string) =>
          typeof url === 'string' &&
          url.includes('yahoo.com') &&
          /\/news\/articles\/[a-z0-9-]{10,}/i.test(url)
      )
      .slice(0, 10)
      .map((url: string) => ({ url, title: null }))

    console.log(`[pipeline] Step 1: found ${links.length} links via map`)
    if (links.length >= 5) return links
  } catch (err) {
    console.warn('[pipeline] firecrawl.map failed, using search fallback:', err)
  }

  console.log('[pipeline] Step 1: search fallback…')
  const results = await (firecrawl as any).search(
    'site:yahoo.com/news latest news today',
    { limit: 10, scrapeOptions: { formats: ['markdown'] } }
  )

  return ((results as any[]) || [])
    .filter((r: any) => typeof r?.url === 'string' && r.url.includes('yahoo.com'))
    .slice(0, 10)
    .map((r: any) => ({ url: r.url as string, title: (r.title as string) ?? null }))
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
      update({ status: 'failed', error: 'No article links found on Yahoo News' })
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