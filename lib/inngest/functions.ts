/**
 * lib/inngest/functions.ts
 *
 * The news pipeline as an Inngest function.
 * Each article is processed as a durable step so failures are retried
 * independently and the job survives serverless cold-starts.
 *
 * Events
 * ──────
 * Trigger : { name: 'news/pipeline.requested' }
 * Emitted : { name: 'news/article.processed', data: { articleId, title, sourceUrl } }
 *
 * CHANGES in this revision
 * ────────────────────────
 * - Replaced Firecrawl entirely with Playwright (chromium) for all crawling
 *   and scraping. No external crawl service or API key required.
 * - crawlYahooNewsLinks()  → launches a headless browser, navigates to
 *   news.yahoo.com, and collects <a href> links that match the article URL
 *   pattern. Falls back to a raw HTML regex pass on the page source if the
 *   DOM query finds too few results.
 * - scrapeArticle()        → opens each article URL in a new browser page,
 *   extracts the article body text (via a series of CSS selector candidates),
 *   the page title, and the first og:image / twitter:image meta tag.
 * - A single browser instance is created once per pipeline run and closed
 *   after all articles are processed, keeping resource usage low.
 * - isRealArticleUrl() helper is retained unchanged — it guards against
 *   slideshow / hub pages regardless of how the links were discovered.
 * - All Inngest-level fixes from the previous revision are preserved:
 *     • No `logger` in destructured params.
 *     • step.sendEvent() instead of inngest.send().
 *     • Sequential for-loop instead of Promise.allSettled(step.run()).
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
  markdown: string   // We store plain text here; variable name kept for compat
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
 * Returns true for URLs that look like real Yahoo News articles.
 *
 * Real URL patterns observed:
 *   ✓ /news/article/slug-with-words-123abc456.html
 *   ✓ /news/article-breaking-witnesses-driver-023737737.html
 *
 * URLs to EXCLUDE:
 *   ✗ /news/article-slideshow-*
 *   ✗ /news/article-featured.html
 *   ✗ /news/article  (bare path)
 */
function isRealArticleUrl(url: string): boolean {
  if (!url.includes('yahoo.com')) return false
  if (!/yahoo\.com\/news\/article/i.test(url)) return false
  if (/\/article-slideshow-/i.test(url)) return false
  if (/\/news\/article(-featured)?\.html?$/i.test(url)) return false
  if (/\/news\/article\/?$/i.test(url)) return false
  // Must have a meaningful slug segment (≥10 chars after the path token)
  if (!/\/article[-/][a-z0-9][-a-z0-9]{8,}/i.test(url)) return false
  return true
}

// ─── Playwright crawl helpers ──────────────────────────────────────────────────

/**
 * Launches a headless Chromium browser and returns it.
 * Caller is responsible for calling browser.close().
 */
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

/**
 * Creates a new browser page with a realistic user-agent and common headers
 * to reduce the chance of bot-detection blocks on news sites.
 */
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
    },
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: true,
  })
  return context.newPage()
}

/**
 * Crawl the Yahoo News homepage with Playwright and return up to `limit`
 * article links. Falls back to a raw-HTML regex scan if DOM query returns
 * too few results (e.g. when JS rendering is partially blocked).
 */
async function crawlYahooNewsLinks(
  browser: Browser,
  limit = 10
): Promise<ArticleLink[]> {
  const page = await newStealthPage(browser)

  try {
    console.log('[playwright] navigating to news.yahoo.com…')
    await page.goto('https://news.yahoo.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    // Wait briefly for any lazy-loaded link elements to appear
    await page.waitForTimeout(2_000)

    // ── Strategy 1: DOM query for <a> tags ──────────────────────────────
    const domLinks: ArticleLink[] = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'))
      return anchors
        .map((a) => ({
          url: (a as HTMLAnchorElement).href,
          title: (a as HTMLAnchorElement).textContent?.trim() || null,
        }))
        .filter((l) => l.url.startsWith('http'))
    })

    const filteredDom = domLinks
      .filter((l) => isRealArticleUrl(l.url))
      // Deduplicate by URL
      .filter((l, i, arr) => arr.findIndex((x) => x.url === l.url) === i)
      .slice(0, limit)

    console.log(`[playwright] DOM query found ${filteredDom.length} article links`)

    if (filteredDom.length >= 3) return filteredDom

    // ── Strategy 2: Raw HTML regex fallback ────────────────────────────
    console.log('[playwright] falling back to HTML regex scan…')
    const html = await page.content()
    const matches = [...html.matchAll(/href="(https:\/\/[^"]*yahoo\.com\/news\/article[^"]{8,})"/g)]
    const regexLinks = matches
      .map((m) => m[1].split('?')[0])
      .filter(isRealArticleUrl)
      .filter((url, i, arr) => arr.indexOf(url) === i)
      .slice(0, limit)
      .map((url) => ({ url, title: null as null }))

    console.log(`[playwright] HTML regex found ${regexLinks.length} links`)
    return regexLinks
  } finally {
    await page.close()
  }
}

/**
 * Ordered list of CSS selectors tried when extracting article body text.
 * First selector that yields ≥200 characters wins.
 */
const ARTICLE_BODY_SELECTORS = [
  'article',
  '[data-test-locator="articleBody"]',
  '.caas-body',
  '.article-body',
  '.body-text',
  'main',
  '#article-content',
  '.content-body',
  'p',  // last-resort: grab all paragraphs
]

/**
 * Scrape a single article URL with Playwright.
 * Returns null if the page yields insufficient content.
 */
async function scrapeArticleWithPlaywright(
  browser: Browser,
  link: ArticleLink
): Promise<ScrapedPage | null> {
  const page = await newStealthPage(browser)

  try {
    await page.goto(link.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForTimeout(1_500)

    // ── Title ──────────────────────────────────────────────────────────
    const title: string | null = await page.evaluate(() => {
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
      if (og?.content) return og.content
      const tw = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
      if (tw?.content) return tw.content
      return document.title || null
    })

    // ── Image ──────────────────────────────────────────────────────────
    const image: string | null = await page.evaluate(() => {
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
      if (og?.content?.startsWith('http')) return og.content
      const tw = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')
      if (tw?.content?.startsWith('http')) return tw.content
      const img = document.querySelector<HTMLImageElement>('article img[src]')
      if (img?.src?.startsWith('http')) return img.src
      return null
    })

    // ── Body text ──────────────────────────────────────────────────────
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

    // Last resort: collect all <p> text across the page
    if (bodyText.length < 200) {
      bodyText = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('p'))
          .map((p) => (p as HTMLElement).innerText?.trim())
          .filter(Boolean)
          .join('\n\n')
          .slice(0, 5000)
      })
    }

    if (bodyText.length < 100) {
      console.warn(`[playwright] insufficient content for ${link.url}`)
      return null
    }

    return {
      url: link.url,
      title: title ?? link.title,
      markdown: bodyText,   // plain text stored in 'markdown' field for compat
      image,
    }
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

    // ── Steps 2–4: Per-article scrape → generate → save ──────────────────────
    // Steps must run sequentially — Promise.allSettled with step.run() is not
    // supported by Inngest and causes silent failures or deadlocks.
    const articles: Array<
      | { sourceUrl: string; title: string; articleId: string | null }
      | { sourceUrl: string; error: string }
    > = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]

      const result = await step
        .run(`process-article-${i}`, async () => {
          console.log(`[inngest] [${i + 1}/${links.length}] scraping: ${link.url}`)

          // Each step gets its own browser instance so a crashed page doesn't
          // affect other steps and Inngest retries start clean.
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

          // Use step.sendEvent() — calling inngest.send() directly bypasses
          // Inngest's event tracking and can cause duplicate events on retries.
          await step.sendEvent('article-processed-event', {
            name: 'news/article.processed',
            data: { articleId, title: generated.title, sourceUrl: link.url },
          })

          console.log(`[inngest] ✓ "${generated.title}" → id:${articleId}`)
          return { sourceUrl: link.url, title: generated.title, articleId }
        })
        // Catch per-step so one failure doesn't abort the whole pipeline
        .catch((err: unknown) => ({
          sourceUrl: link.url,
          error: err instanceof Error ? err.message : String(err),
        }))

      articles.push(result)
    }

    const done    = articles.filter(r => !('error' in r)).length
    const failed  = articles.filter(r =>  'error' in r).length

    return { total: links.length, done, failed, articles }
  }
)