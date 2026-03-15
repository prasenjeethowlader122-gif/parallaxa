/**
 * news-pipeline.ts
 *
 * Full pipeline:
 *   1. Crawl https://www.yahoo.com/news/articles/ → extract 10 article URLs
 *   2. Scrape each URL for markdown + hero image
 *   3. Generate a news article via HuggingFace (streaming collapsed to string)
 *   4. Save each article to SQLite
 */

import Firecrawl from '@mendable/firecrawl-js'
import { OpenAI } from 'openai'
import {
  updateJobStatus,
  createArticleRecord,
  updateArticle,
} from './db'

// ─── Clients ──────────────────────────────────────────────────────────────

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY ?? 'fc-da0837003c26469da0f8c259c6c10944',
})

const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey:  process.env.HF_API_KEY ?? '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',
})

const HF_MODEL = process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

// ─── Types ────────────────────────────────────────────────────────────────

interface CrawlLink {
  url:   string
  title: string | null
}

interface ScrapedPage {
  url:      string
  title:    string | null
  markdown: string
  image:    string | null
}

// ─── Step 1 – Crawl Yahoo News for article links ─────────────────────────

export async function crawlYahooNewsLinks(): Promise<CrawlLink[]> {
  console.log('[pipeline] Step 1: crawling Yahoo News…')

  // Use Firecrawl map to discover URLs from the Yahoo News articles section
  const mapResult = await (firecrawl as any).map('https://www.yahoo.com/news/articles/', {
    limit: 30,           // grab extra; we'll filter down to 10 real articles
    includeSubdomains: false,
  })

  // mapResult may be { links: string[] } or string[]
  const rawLinks: string[] = Array.isArray(mapResult)
    ? mapResult
    : (mapResult?.links ?? [])

  // Filter to actual article URLs (contain a path segment after /news/articles/)
  const articleLinks = rawLinks
    .filter((url: string) =>
      typeof url === 'string' &&
      url.includes('yahoo.com') &&
      /\/news\/articles\/[a-z0-9-]{10,}/i.test(url)
    )
    .slice(0, 10)
    .map((url: string) => ({ url, title: null }))

  console.log(`[pipeline] Step 1: found ${articleLinks.length} article links`)

  // Fallback: if map didn't find enough, use firecrawl.search to find Yahoo News articles
  if (articleLinks.length < 5) {
    console.log('[pipeline] Step 1: fallback – searching Yahoo News…')
    const searchResults = await (firecrawl as any).search('site:yahoo.com/news latest news today', {
      limit: 10,
      scrapeOptions: { formats: ['markdown'] },
    })

    const fallback: CrawlLink[] = ((searchResults as any[]) || [])
      .filter((r: any) => r?.url?.includes('yahoo.com'))
      .slice(0, 10)
      .map((r: any) => ({ url: r.url, title: r.title ?? null }))

    return fallback
  }

  return articleLinks
}

// ─── Step 2 – Scrape each article URL ────────────────────────────────────

function extractImage(page: any): string | null {
  const og = page?.metadata?.ogImage ?? page?.metadata?.image ?? null
  if (og && og.startsWith('http')) return og

  if (page?.html) {
    const m = page.html.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (m?.[1]?.startsWith('http')) return m[1]
  }

  if (page?.markdown) {
    const m = page.markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
    if (m?.[1]) return m[1]
  }

  return null
}

export async function scrapeArticle(link: CrawlLink): Promise<ScrapedPage | null> {
  try {
    const page = await firecrawl.scrapeUrl(link.url, {
      formats: ['markdown', 'html'],
    }) as any

    const markdown = (page?.markdown ?? '').slice(0, 5000)
    if (markdown.length < 100) return null

    const title = page?.metadata?.title ?? link.title ?? null
    const image = extractImage(page)

    return { url: link.url, title, markdown, image }
  } catch (err) {
    console.warn(`[pipeline] scrape failed for ${link.url}:`, err)
    return null
  }
}

// ─── Step 3 – Generate article with HuggingFace ───────────────────────────

async function generateArticle(page: ScrapedPage): Promise<{ title: string; body: string }> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a professional news journalist.
Write a clear, engaging news article based solely on the provided source material.
Respond in EXACTLY this format and no other:

TITLE: <compelling headline>
---
<article body in 4-5 paragraphs, plain text only, no markdown>`,
    },
    {
      role: 'user',
      content: `Source URL: ${page.url}\n\nSource content:\n\n${page.markdown}`,
    },
  ]

  // Collect streaming response into a string
  const stream = await hfClient.chat.completions.create({
    model:       HF_MODEL,
    messages,
    stream:      true,
    max_tokens:  1000,
    temperature: 0.6,
  })

  let full = ''
  for await (const chunk of stream) {
    full += chunk.choices[0]?.delta?.content ?? ''
  }

  // Parse TITLE and body
  const titleMatch = full.match(/TITLE:\s*(.+)/i)
  const bodyMatch  = full.split(/^---$/m)

  const title = titleMatch?.[1]?.trim() ?? page.title ?? 'Untitled'
  const body  = (bodyMatch[1] ?? full).trim()

  return { title, body }
}

// ─── Main pipeline ────────────────────────────────────────────────────────

/**
 * Run the full pipeline for a given jobId.
 * Should be called from the API route AFTER the job row is created.
 */
export async function runNewsPipeline(jobId: number): Promise<void> {
  try {
    updateJobStatus(jobId, 'running')

    // ── 1. Crawl Yahoo News ──────────────────────────────────────────────
    const links = await crawlYahooNewsLinks()

    if (!links.length) {
      updateJobStatus(jobId, 'failed', 'No article links found on Yahoo News')
      return
    }

    // ── 2. Process each article ──────────────────────────────────────────
    for (const link of links) {
      // Create a pending article record immediately so progress is visible
      const articleRecord = createArticleRecord(jobId, link.url, link.title)

      try {
        // 2a. Scrape
        console.log(`[pipeline] scraping: ${link.url}`)
        const page = await scrapeArticle(link)

        if (!page) {
          updateArticle(articleRecord.id, { status: 'failed', error: 'Could not scrape content' })
          continue
        }

        // Update hero image if found
        if (page.image) {
          updateArticle(articleRecord.id, { hero_image: page.image })
        }

        // 2b. Generate
        console.log(`[pipeline] generating article for: ${link.url}`)
        const { title, body } = await generateArticle(page)

        // 2c. Save
        updateArticle(articleRecord.id, {
          title,
          body,
          status:     'done',
          hero_image: page.image,
        })

        console.log(`[pipeline] ✓ saved article: "${title}"`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[pipeline] article failed (${link.url}):`, msg)
        updateArticle(articleRecord.id, { status: 'failed', error: msg })
      }
    }

    updateJobStatus(jobId, 'done')
    console.log(`[pipeline] job ${jobId} complete.`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] job ${jobId} fatal error:`, msg)
    updateJobStatus(jobId, 'failed', msg)
  }
}