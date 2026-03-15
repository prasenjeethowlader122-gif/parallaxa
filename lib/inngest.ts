/**
 * lib/news-pipeline.ts
 *
 * Full pipeline powered by Inngest:
 *   step 1 – Crawl https://www.yahoo.com/news/articles/ → up to 10 article URLs
 *   step 2 – For each URL: scrape → generate via HuggingFace AI → save to Neon
 *
 * Job state is persisted by Inngest (retries, durability).
 * Article rows are stored in your existing Neon `articles` table.
 *
 * Event fired:   news/pipeline.requested  { jobId? }
 * Function id:   news-pipeline
 */

import Firecrawl from '@mendable/firecrawl-js'
import { OpenAI } from 'openai'
import { inngest } from '@/lib/inngest'
import { createArticle } from '@/lib/db/articles'

// ─── Clients ──────────────────────────────────────────────────────────────────

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY ?? 'fc-da0837003c26469da0f8c259c6c10944',
})

const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey:  process.env.HUGGINGFACE_API_KEY ?? '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',
})

const HF_MODEL = process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

// ─── Public types (used by the dashboard) ────────────────────────────────────

export interface PipelineArticle {
  sourceUrl:  string
  title:      string | null
  status:     'pending' | 'done' | 'failed'
  articleId:  string | null
  error?:     string
}

export interface PipelineJob {
  id:        string
  status:    'pending' | 'running' | 'done' | 'failed'
  createdAt: Date
  updatedAt: Date
  error?:    string
  progress:  { total: number; done: number; failed: number }
  articles:  PipelineArticle[]
}

// ─── In-memory job store (for dashboard polling) ──────────────────────────────
// Inngest handles durability; this store gives the UI fast live progress.

const jobStore = new Map<string, PipelineJob>()

export function getJob(jobId: string): PipelineJob | null {
  return jobStore.get(jobId) ?? null
}

export function listJobs(): PipelineJob[] {
  return Array.from(jobStore.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  )
}

function upsertJob(patch: Partial<PipelineJob> & { id: string }): PipelineJob {
  const existing = jobStore.get(patch.id)
  const next: PipelineJob = {
    id:        patch.id,
    status:    patch.status    ?? existing?.status    ?? 'pending',
    createdAt: existing?.createdAt                    ?? new Date(),
    updatedAt: new Date(),
    error:     patch.error     ?? existing?.error,
    progress:  patch.progress  ?? existing?.progress  ?? { total: 0, done: 0, failed: 0 },
    articles:  patch.articles  ?? existing?.articles  ?? [],
  }
  jobStore.set(patch.id, next)
  return next
}

// ─── Step helpers (pure, no Inngest coupling) ─────────────────────────────────

async function crawlYahooNewsLinks(): Promise<{ url: string; title: string | null }[]> {
  console.log('[pipeline] crawling Yahoo News…')

  try {
    const mapResult = await (firecrawl as any).map(
      'https://www.yahoo.com/news/articles/',
      { limit: 30, includeSubdomains: false }
    )

    const rawLinks: string[] = Array.isArray(mapResult)
      ? mapResult
      : (mapResult?.links ?? [])

    const links = rawLinks
      .filter((url: string) =>
        typeof url === 'string' &&
        url.includes('yahoo.com') &&
        /\/news\/articles\/[a-z0-9-]{10,}/i.test(url)
      )
      .slice(0, 10)
      .map((url: string) => ({ url, title: null }))

    console.log(`[pipeline] found ${links.length} links via map`)
    if (links.length >= 5) return links
  } catch (err) {
    console.warn('[pipeline] firecrawl.map failed, falling back to search:', err)
  }

  const results = await (firecrawl as any).search(
    'site:yahoo.com/news latest news today',
    { limit: 10, scrapeOptions: { formats: ['markdown'] } }
  )

  return ((results as any[]) || [])
    .filter((r: any) => typeof r?.url === 'string' && r.url.includes('yahoo.com'))
    .slice(0, 10)
    .map((r: any) => ({ url: r.url as string, title: (r.title as string) ?? null }))
}

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
    const page = await firecrawl.scrapeUrl(link.url, {
      formats: ['markdown', 'html'],
    }) as any

    const markdown = ((page?.markdown ?? '') as string).slice(0, 5000)
    if (markdown.length < 100) return null

    return {
      url:      link.url,
      title:    (page?.metadata?.title as string | undefined) ?? link.title ?? null,
      markdown,
      image:    extractImage(page),
    }
  } catch (err) {
    console.warn(`[pipeline] scrape failed for ${link.url}:`, err)
    return null
  }
}

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
    model:       HF_MODEL,
    messages,
    stream:      true,
    max_tokens:  1200,
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
      title:       String(parsed.title       ?? page.title ?? 'Untitled'),
      description: String(parsed.description ?? ''),
      content:     String(parsed.content     ?? ''),
      category:    String(parsed.category    ?? 'World'),
    }
  } catch {
    const titleMatch = raw.match(/TITLE:\s*(.+)/i)
    return {
      title:       titleMatch?.[1]?.trim() ?? page.title ?? 'Untitled',
      description: '',
      content:     raw.trim(),
      category:    'World',
    }
  }
}

async function saveToNeon(
  generated: { title: string; description: string; content: string; category: string },
  page: { image: string | null }
): Promise<string | null> {
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

  return saved?.id ?? null
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const newsPipelineFunction = inngest.createFunction(
  {
    id:          'news-pipeline',
    name:        'Yahoo News Pipeline',
    retries:     2,
    // Prevent overlapping runs
    concurrency: { limit: 1 },
  },
  { event: 'news/pipeline.requested' },

  async ({ event, step }) => {
    const jobId: string = event.data?.jobId ?? event.id

    // ── Initialise job in the store ──────────────────────────────────────────
    upsertJob({ id: jobId, status: 'running' })

    // ── Step 1: crawl ────────────────────────────────────────────────────────
    const links = await step.run('crawl-yahoo-news', async () => {
      const found = await crawlYahooNewsLinks()
      if (!found.length) throw new Error('No article links found on Yahoo News')

      upsertJob({
        id:       jobId,
        status:   'running',
        progress: { total: found.length, done: 0, failed: 0 },
        articles: found.map(l => ({
          sourceUrl: l.url,
          title:     l.title,
          status:    'pending',
          articleId: null,
        })),
      })

      return found
    })

    // ── Steps 2-4: per-article scrape → generate → save ──────────────────────
    for (let i = 0; i < links.length; i++) {
      const link = links[i]

      await step.run(`process-article-${i}`, async () => {
        const job = jobStore.get(jobId)!
        const meta = job.articles[i]

        try {
          console.log(`[pipeline] [${i + 1}/${links.length}] scraping: ${link.url}`)
          const page = await scrapeArticle(link)

          if (!page) {
            meta.status = 'failed'
            meta.error  = 'Could not scrape content'
            job.progress.failed++
            upsertJob({ id: jobId })
            return
          }

          console.log(`[pipeline] [${i + 1}/${links.length}] generating…`)
          const generated = await generateArticle(page)

          console.log(`[pipeline] [${i + 1}/${links.length}] saving to Neon…`)
          const savedId = await saveToNeon(generated, page)

          meta.title     = generated.title
          meta.status    = 'done'
          meta.articleId = savedId
          job.progress.done++
          upsertJob({ id: jobId })

          console.log(`[pipeline] ✓ "${generated.title}" → id:${savedId}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[pipeline] ✗ ${link.url}:`, msg)
          meta.status = 'failed'
          meta.error  = msg
          job.progress.failed++
          upsertJob({ id: jobId })
        }
      })
    }

    // ── Mark done ────────────────────────────────────────────────────────────
    upsertJob({ id: jobId, status: 'done' })

    const job = jobStore.get(jobId)!
    console.log(
      `[pipeline] job ${jobId} complete — done:${job.progress.done} failed:${job.progress.failed}`
    )

    return { jobId, ...job.progress }
  }
)