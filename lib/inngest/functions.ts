/**
 * lib/inngest/functions.ts
 *
 * FIXES applied:
 * 1. isRealArticleUrl() - relaxed to catch more valid Yahoo article URLs
 * 2. crawlYahooNewsLinks() - added scroll + longer wait + search.yahoo.com fallback
 * 3. Multiple source strategies so one blocked page doesn't kill the whole run
 */

import { inngest } from './client'
import { chromium, Browser, Page } from 'playwright'
import { OpenAI } from 'openai'
import { createArticle } from '@/lib/db/articles'

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

// ─── URL helpers ──────────────────────────────────────────────────────────────

/**
 * FIX #1: Much more permissive URL filter.
 *
 * Old version required the path to contain "/news/article" and a very specific
 * slug pattern — this excluded the majority of real Yahoo News URLs which look
 * like /news/some-headline-words-123abc.html or just /news/slug.
 */
function isRealArticleUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('yahoo.com')) return false

    const path = u.pathname

    // Must be under /news/
    if (!path.includes('/news/')) return false

    // Exclude obvious non-article sections
    if (/\/(video|photos?|slideshow|live|tag|topic|section|author|category)\//i.test(path)) return false

    // Exclude bare section hub pages like /news, /news/sports
    const slug = path.split('/').filter(Boolean).pop() ?? ''
    if (slug.length < 8) return false
    if (/^(news|sports|finance|entertainment|lifestyle|health|science|technology|world)$/.test(slug)) return false

    return true
  } catch {
    return false
  }
}

// ─── Playwright helpers ───────────────────────────────────────────────────────

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })
}

async function newStealthPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
    },
    viewport: { width: 1280, height: 900 },
    javaScriptEnabled: true,
  })
  return context.newPage()
}

/**
 * Collect links from one page URL using DOM + HTML regex strategies.
 */
async function collectLinksFromPage(page: Page, pageUrl: string, limit: number): Promise<ArticleLink[]> {
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // FIX #2a: scroll down to trigger lazy-load of article links
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(2_000)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1_500)

    // Strategy 1: DOM <a> tags
    const domLinks: ArticleLink[] = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => ({
          url: (a as HTMLAnchorElement).href,
          title: (a as HTMLAnchorElement).textContent?.trim() || null,
        }))
        .filter((l) => l.url.startsWith('http'))
    )

    const filtered = domLinks
      .filter((l) => isRealArticleUrl(l.url))
      .map((l) => ({ url: l.url.split('?')[0], title: l.title }))
      .filter((l, i, arr) => arr.findIndex((x) => x.url === l.url) === i)
      .slice(0, limit)

    console.log(`[playwright] DOM found ${filtered.length} links from ${pageUrl}`)
    if (filtered.length >= 3) return filtered

    // Strategy 2: raw HTML regex scan
    const html = await page.content()
    const regexMatches = [
      ...html.matchAll(/href="(https?:\/\/[^"]*yahoo\.com\/news\/[^"]{8,})"/g),
    ]
    const regexLinks = regexMatches
      .map((m) => m[1].split('?')[0])
      .filter(isRealArticleUrl)
      .filter((url, i, arr) => arr.indexOf(url) === i)
      .slice(0, limit)
      .map((url) => ({ url, title: null as null }))

    console.log(`[playwright] HTML regex found ${regexLinks.length} links from ${pageUrl}`)
    return regexLinks
  } catch (err) {
    console.warn(`[playwright] failed to collect links from ${pageUrl}:`, err)
    return []
  }
}

/**
 * FIX #2: Multi-source crawl with fallback.
 *
 * Tries these sources in order until we have enough links:
 *  1. news.yahoo.com (homepage)
 *  2. search.yahoo.com/search?p=news+today (bypasses homepage JS guard)
 *  3. finance.yahoo.com/news (often less guarded)
 *
 * Each source uses DOM + HTML regex sub-strategies (unchanged).
 */
async function crawlYahooNewsLinks(browser: Browser, limit = 10): Promise<ArticleLink[]> {
  const SOURCES = [
    'https://news.yahoo.com',
    'https://search.yahoo.com/search?p=latest+news+today&fr=news',
    'https://finance.yahoo.com/news/',
  ]

  const collected: Map<string, ArticleLink> = new Map()

  for (const source of SOURCES) {
    if (collected.size >= limit) break

    console.log(`[playwright] trying source: ${source}`)
    const page = await newStealthPage(browser)
    try {
      const links = await collectLinksFromPage(page, source, limit)
      for (const link of links) {
        if (!collected.has(link.url)) collected.set(link.url, link)
        if (collected.size >= limit) break
      }
    } finally {
      await page.close()
    }
  }

  const result = [...collected.values()].slice(0, limit)
  console.log(`[playwright] total unique article links found: ${result.length}`)
  return result
}

// ─── Article scraping ─────────────────────────────────────────────────────────

const ARTICLE_BODY_SELECTORS = [
  'article',
  '[data-test-locator="articleBody"]',
  '.caas-body',
  '.article-body',
  '.body-text',
  'main',
  '#article-content',
  '.content-body',
  'p',
]

async function scrapeArticleWithPlaywright(
  browser: Browser,
  link: ArticleLink
): Promise<ScrapedPage | null> {
  const page = await newStealthPage(browser)

  try {
    await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(1_500)

    const title: string | null = await page.evaluate(() => {
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
      if (og?.content) return og.content
      const tw = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
      if (tw?.content) return tw.content
      return document.title || null
    })

    const image: string | null = await page.evaluate(() => {
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
      if (og?.content?.startsWith('http')) return og.content
      const tw = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')
      if (tw?.content?.startsWith('http')) return tw.content
      const img = document.querySelector<HTMLImageElement>('article img[src]')
      if (img?.src?.startsWith('http')) return img.src
      return null
    })

    let bodyText = ''

    for (const selector of ARTICLE_BODY_SELECTORS) {
      const text: string = await page.evaluate((sel: string) => {
        const el = document.querySelector(sel)
        return el ? (el as HTMLElement).innerText ?? '' : ''
      }, selector)

      if (text.length >= 200) {
        bodyText = text.slice(0, 5000)
        break
      }
    }

    if (bodyText.length < 200) {
      bodyText = await page.evaluate(() =>
        Array.from(document.querySelectorAll('p'))
          .map((p) => (p as HTMLElement).innerText?.trim())
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 5000)
      )
    }

    if (bodyText.length < 100) {
      console.warn(`[playwright] insufficient content for ${link.url}`)
      return null
    }

    return { url: link.url, title: title ?? link.title, markdown: bodyText, image }
  } catch (err) {
    console.warn(`[playwright] scrape failed for ${link.url}:`, err)
    return null
  } finally {
    await page.close()
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
      console.log('[inngest] Crawling Yahoo News with Playwright…')
      const browser = await launchBrowser()
      try {
        const found = await crawlYahooNewsLinks(browser, 10)
        if (!found.length) throw new Error('No article links found on Yahoo News')
        console.log(`[inngest] Found ${found.length} links`)
        return found
      } finally {
        await browser.close()
      }
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

          const browser = await launchBrowser()
          let page: ScrapedPage | null = null
          try {
            page = await scrapeArticleWithPlaywright(browser, link)
          } finally {
            await browser.close()
          }

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