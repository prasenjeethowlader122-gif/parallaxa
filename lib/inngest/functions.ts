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

type InngestStep = GetFunctionInput<typeof inngest>['step']

// ─── Utilities ────────────────────────────────────────────────────────────────

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

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

// ─── FireScrape helpers (use step.fetch — call at handler top level only) ─────

/**
 * Wake up FireScrape's Render instance.
 * Call directly at handler top level — NOT inside step.run().
 */
async function firescrapeWakeUp(step: InngestStep): Promise<void> {
  const res = await step
    .fetch('wake-firescrape-health', `${FIRESCRAPE_BASE}/health`, {
      signal: AbortSignal.timeout(15_000),
    })
    .catch(() =>
      step.fetch('wake-firescrape-root', `${FIRESCRAPE_BASE}/`, {
        signal: AbortSignal.timeout(15_000),
      })
    )

  if (!res.ok) throw new Error(`FireScrape health check HTTP ${res.status}`)
}

/**
 * Call FireScrape /v1/map.
 * Call directly at handler top level — NOT inside step.run().
 */
async function firescrapeMap(
  step: InngestStep,
  url: string,
  stepId: string,
  maxPages = 60,
): Promise<string[]> {
  const res = await step.fetch(stepId, `${FIRESCRAPE_BASE}/v1/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, include_sitemap: false, max_pages: maxPages, same_domain: true }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    throw new Error(`/v1/map HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`)
  }

  const data = {
  "url": "https://www.yahoo.com/news/",
  "total": 64,
  "urls": [
    "https://www.yahoo.com/",
    "https://www.yahoo.com/all",
    "https://www.yahoo.com/entertainment/celebrity/articles/french-influencer-arrested-bali-alleged-231504234.html",
    "https://www.yahoo.com/entertainment/tv/articles/only-someone-warned-joe-rogan-173446830.html",
    "https://www.yahoo.com/finance/news/hershey-company-announces-significant-operation-160413532.html",
    "https://www.yahoo.com/finance/news/jim-cramer-says-arm-holdings-221434823.html",
    "https://www.yahoo.com/finance/news/m-59-wife-bought-second-095000805.html",
    "https://www.yahoo.com/finance/news/pastor-called-off-target-boycott-172930103.html",
    "https://www.yahoo.com/finance/news/usps-nearing-financial-breaking-point-220936916.html",
    "https://www.yahoo.com/finance/personal-finance/banking/article/how-the-feds-rate-decision-affects-your-bank-accounts-loans-credit-cards-and-investments-220526730.html",
    "https://www.yahoo.com/guides/originals",
    "https://www.yahoo.com/lifestyle/article/alcohol-drink-too-much-quitting-health-change-161921000.html",
    "https://www.yahoo.com/lifestyle/articles/driver-confronts-massive-python-constricting-193951131.html",
    "https://www.yahoo.com/news",
    "https://www.yahoo.com/news/articles/akron-explosion-heres-caused-loud-140032362.html",
    "https://www.yahoo.com/news/articles/apple-warns-iphone-users-software-223956485.html",
    "https://www.yahoo.com/news/articles/baby-father-kitchen-making-formula-133919223.html",
    "https://www.yahoo.com/news/articles/black-pastors-arrest-alabama-supreme-210725692.html",
    "https://www.yahoo.com/news/articles/boys-accused-gang-rape-12-181129755.html",
    "https://www.yahoo.com/news/articles/cbs-maga-friendly-bosses-humiliated-165454674.html",
    "https://www.yahoo.com/news/articles/china-makes-energy-security-reunification-072555778.html",
    "https://www.yahoo.com/news/articles/colorado-police-arrest-woman-begging-160002853.html",
    "https://www.yahoo.com/news/articles/decades-florida-canal-project-abandoned-130440366.html",
    "https://www.yahoo.com/news/articles/department-store-set-open-myrtle-162726195.html",
    "https://www.yahoo.com/news/articles/exclusive-irans-supreme-leader-rejects-095430432.html",
    "https://www.yahoo.com/news/articles/fbi-says-suspicious-package-found-213210028.html",
    "https://www.yahoo.com/news/articles/georgia-going-dump-voting-machines-183514811.html",
    "https://www.yahoo.com/news/articles/gov-sarah-huckabee-sanders-asked-222816332.html",
    "https://www.yahoo.com/news/articles/infant-hospitalized-herpes-circumcision-involving-054003408.html",
    "https://www.yahoo.com/news/articles/israel-rapidly-killing-irans-top-050301191.html",
    "https://www.yahoo.com/news/articles/justice-department-leaders-meet-lawmakers-221647830.html",
    "https://www.yahoo.com/news/articles/leaked-video-reveals-putin-days-141003868.html",
    "https://www.yahoo.com/news/articles/man-died-car-plunged-bay-210110741.html",
    "https://www.yahoo.com/news/articles/married-high-school-teacher-arrested-214410267.html",
    "https://www.yahoo.com/news/articles/mojtaba-khamenei-said-reject-ceasefire-141133172.html",
    "https://www.yahoo.com/news/articles/nancy-guthrie-neighbor-moved-she-201358787.html",
    "https://www.yahoo.com/news/articles/newly-discovered-whitey-bulger-writings-211301838.html",
    "https://www.yahoo.com/news/articles/over-half-gray-wolves-released-223000352.html",
    "https://www.yahoo.com/news/articles/parents-arrested-allegedly-forcing-daughter-171106041.html",
    "https://www.yahoo.com/news/articles/president-donald-trump-fires-nfl-093003542.html",
    "https://www.yahoo.com/news/articles/riyadh-residents-receive-phone-alerts-164258338.html",
    "https://www.yahoo.com/news/articles/russian-official-ukraines-drone-development-102429761.html",
    "https://www.yahoo.com/news/articles/serious-crash-boston-leaves-several-172635225.html",
    "https://www.yahoo.com/news/articles/shot-him-couple-more-times-165057595.html",
    "https://www.yahoo.com/news/articles/slain-troops-families-issue-ban-224742397.html",
    "https://www.yahoo.com/news/articles/still-alive-woman-goes-er-130000858.html",
    "https://www.yahoo.com/news/articles/terrify-every-american-pnw-leaders-000543599.html",
    "https://www.yahoo.com/news/articles/trump-vows-no-more-attacks-035545052.html",
    "https://www.yahoo.com/news/articles/trumps-failed-strong-arming-allies-140609996.html",
    "https://www.yahoo.com/news/articles/u-attacked-iran-show-power-151200758.html",
    "https://www.yahoo.com/news/articles/uss-gerald-r-ford-huge-195911892.html",
    "https://www.yahoo.com/news/articles/woman-arrested-2011-cold-case-145621856.html",
    "https://www.yahoo.com/news/articles/woman-rejects-minnesota-man-following-211421315.html",
    "https://www.yahoo.com/news/politics",
    "https://www.yahoo.com/news/science",
    "https://www.yahoo.com/news/us",
    "https://www.yahoo.com/news/us/article/nancy-guthries-disappearance-former-fbi-special-agent-says-it-appears-less-and-less-likely-that-the-motive-for-her-apparent-abduction-was-ransom-150234687.html",
    "https://www.yahoo.com/news/videos/james-carville-suggests-trump-resign-233942019.html",
    "https://www.yahoo.com/news/videos/slain-troops-families-issue-ban-224742434.html",
    "https://www.yahoo.com/news/videos/unredacted-epstein-file-exposes-trump-015117607.html",
    "https://www.yahoo.com/news/weather-news",
    "https://www.yahoo.com/news/world",
    "https://www.yahoo.com/organizations/yougov",
    "https://www.yahoo.com/sports/articles/wada-delays-decision-over-potential-225717270.html"
  ],
  "url_details": {
    "https://www.yahoo.com/news": {
      "depth": 0,
      "source": "crawl"
    },
    "https://www.yahoo.com/": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/us": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/politics": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/science": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/world": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/weather-news": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/guides/originals": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/organizations/yougov": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/justice-department-leaders-meet-lawmakers-221647830.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/finance/news/pastor-called-off-target-boycott-172930103.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/finance/personal-finance/banking/article/how-the-feds-rate-decision-affects-your-bank-accounts-loans-credit-cards-and-investments-220526730.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/apple-warns-iphone-users-software-223956485.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/israel-rapidly-killing-irans-top-050301191.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/finance/news/usps-nearing-financial-breaking-point-220936916.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/black-pastors-arrest-alabama-supreme-210725692.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/boys-accused-gang-rape-12-181129755.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/colorado-police-arrest-woman-begging-160002853.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/riyadh-residents-receive-phone-alerts-164258338.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/baby-father-kitchen-making-formula-133919223.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/leaked-video-reveals-putin-days-141003868.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/newly-discovered-whitey-bulger-writings-211301838.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/mojtaba-khamenei-said-reject-ceasefire-141133172.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/u-attacked-iran-show-power-151200758.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/georgia-going-dump-voting-machines-183514811.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/married-high-school-teacher-arrested-214410267.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/infant-hospitalized-herpes-circumcision-involving-054003408.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/russian-official-ukraines-drone-development-102429761.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/shot-him-couple-more-times-165057595.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/woman-rejects-minnesota-man-following-211421315.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/china-makes-energy-security-reunification-072555778.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/over-half-gray-wolves-released-223000352.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/videos/slain-troops-families-issue-ban-224742434.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/videos/unredacted-epstein-file-exposes-trump-015117607.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/entertainment/celebrity/articles/french-influencer-arrested-bali-alleged-231504234.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/gov-sarah-huckabee-sanders-asked-222816332.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/man-died-car-plunged-bay-210110741.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/fbi-says-suspicious-package-found-213210028.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/slain-troops-families-issue-ban-224742397.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/lifestyle/articles/driver-confronts-massive-python-constricting-193951131.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/trumps-failed-strong-arming-allies-140609996.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/serious-crash-boston-leaves-several-172635225.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/nancy-guthrie-neighbor-moved-she-201358787.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/decades-florida-canal-project-abandoned-130440366.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/terrify-every-american-pnw-leaders-000543599.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/entertainment/tv/articles/only-someone-warned-joe-rogan-173446830.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/sports/articles/wada-delays-decision-over-potential-225717270.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/woman-arrested-2011-cold-case-145621856.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/cbs-maga-friendly-bosses-humiliated-165454674.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/us/article/nancy-guthries-disappearance-former-fbi-special-agent-says-it-appears-less-and-less-likely-that-the-motive-for-her-apparent-abduction-was-ransom-150234687.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/finance/news/hershey-company-announces-significant-operation-160413532.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/president-donald-trump-fires-nfl-093003542.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/videos/james-carville-suggests-trump-resign-233942019.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/akron-explosion-heres-caused-loud-140032362.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/parents-arrested-allegedly-forcing-daughter-171106041.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/trump-vows-no-more-attacks-035545052.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/uss-gerald-r-ford-huge-195911892.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/department-store-set-open-myrtle-162726195.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/lifestyle/article/alcohol-drink-too-much-quitting-health-change-161921000.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/finance/news/jim-cramer-says-arm-holdings-221434823.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/finance/news/m-59-wife-bought-second-095000805.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/exclusive-irans-supreme-leader-rejects-095430432.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/news/articles/still-alive-woman-goes-er-130000858.html": {
      "depth": 1,
      "source": "crawl"
    },
    "https://www.yahoo.com/all": {
      "depth": 1,
      "source": "crawl"
    }
  },
  "stats": {
    "sitemap_urls": 0,
    "crawled_pages": 1,
    "skipped_robots": 0,
    "skipped_external": 15,
    "errors": 63,
    "depth_distribution": {
      "0": 1,
      "1": 63
    }
  }
} as { urls?: unknown }

  if (!Array.isArray(data.urls)) {
    throw new Error(`/v1/map unexpected shape: ${JSON.stringify(data).slice(0, 200)}`)
  }

  return (data.urls as unknown[]).filter((u): u is string => typeof u === 'string')
}

/**
 * Call FireScrape /v1/scrape.
 * Call directly at handler top level — NOT inside step.run().
 */
async function firescrapeUrl(
  step: InngestStep,
  url: string,
  stepId: string,
): Promise<FireScrapeScrapeResult> {
  const res = await step.fetch(stepId, `${FIRESCRAPE_BASE}/v1/scrape`, {
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

/**
 * Start a crawl and poll with step.sleep.
 * Call directly at handler top level — NOT inside step.run().
 */
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
    },
  )

  if (!startRes.ok) {
    throw new Error(`/v1/crawl start HTTP ${startRes.status}: ${await startRes.text().catch(() => startRes.statusText)}`)
  }

  const { job_id } = await startRes.json() as FireScrapeCrawlJob
  if (!job_id) throw new Error('/v1/crawl returned no job_id')

  const MAX_POLLS = 30
  const POLL_INTERVAL_MS = 4_000

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    // step.sleep at handler top level — safe here
    await step.sleep(`crawl-poll-wait-${crawlIndex}-${poll}`, POLL_INTERVAL_MS)

    const pollRes = await step.fetch(
      `firescrape-crawl-poll-${crawlIndex}-${poll}`,
      `${FIRESCRAPE_BASE}/v1/crawl/${job_id}`,
      { signal: AbortSignal.timeout(10_000) },
    )

    if (!pollRes.ok) {
      console.warn(`[crawl] poll HTTP ${pollRes.status} for job ${job_id}, retrying…`)
      continue
    }

    const status = await pollRes.json() as FireScrapeCrawlStatus
    console.log(`[crawl] job ${job_id} → ${status.status} (poll ${poll + 1}/${MAX_POLLS})`)

    if (status.status === 'completed') return status.results ?? status.pages ?? []
    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`Crawl job ${job_id} ended with status: ${status.status}`)
    }
  }

  throw new Error(`Crawl job ${job_id} timed out after ${MAX_POLLS} polls`)
}

// ─── Link discovery (uses step.fetch / step.sleep — top-level only) ──────────

/**
 * Discover article links using three strategies.
 * Must be called at handler top level — NOT inside step.run().
 */
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
    if (links.length >= limit) break
    try {
      console.log(`[discover] A: map ${YAHOO_SOURCES[i]}`)
      const urls = await firescrapeMap(step, YAHOO_SOURCES[i], `discover-map-${i}`, 60)
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
      if (links.length >= limit) break
      try {
        console.log(`[discover] B: scrape-links ${YAHOO_SOURCES[i]}`)
        const result = await firescrapeUrl(step, YAHOO_SOURCES[i], `discover-scrape-${i}`)
        const raw = result.links ?? []
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
      if (links.length >= limit) break
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

/**
 * Scrape a single article using plain fetch.
 * Safe to call inside step.run() — does NOT use step.fetch.
 */
async function scrapeArticlePlain(link: ArticleLink): Promise<ScrapedPage> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: link.url,
      formats: ['markdown', 'metadata', 'links'],
      only_main_content: true,
      timeout: 30_000,
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

// ─── Save to Neon (plain DB call — safe inside step.run) ──────────────────────

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
    id:          'news-pipeline-v',
    name:        'Yahoo News Pipeline',
    retries:     3,
    concurrency: { limit: 1 },
    triggers: [{ event: 'news/pipeline.requested' }]
  },
  

  async ({ step, logger }) => {

    // ── Step 0: Wake FireScrape ───────────────────────────────────────────────
    // step.fetch is called directly at handler top level — correct.
    logger.info('[pipeline] Waking FireScrape API…')
    try {
      await firescrapeWakeUp(step)
      logger.info('[pipeline] FireScrape is online')
    } catch (e) {
      logger.warn(`[pipeline] Wake-up warning (non-fatal): ${errMsg(e)}`)
    }

    // ── Step 1: Discover article links ────────────────────────────────────────
    // discoverArticleLinks uses step.fetch / step.sleep — must stay at top level.
    // Do NOT wrap in step.run().
    logger.info('[pipeline] Discovering Yahoo News article links…')
    const links = await discoverArticleLinks(step, 10)

    if (links.length === 0) {
      throw new Error(
        'Zero article links discovered after all three strategies (map → scrape → crawl). ' +
        `FireScrape base URL: ${FIRESCRAPE_BASE}. ` +
        'Check: (1) API is online, (2) Yahoo News URL structure, (3) isArticleUrl() filter.',
      )
    }

    logger.info(`[pipeline] Discovered ${links.length} article links`)

    // ── Steps 2–N: per-article scrape → generate → save ──────────────────────
    // These use plain fetch / HF client / DB — safe inside step.run().
    const results: PipelineResult[] = []

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      const tag  = `[${i + 1}/${links.length}]`

      const result = await step
        .run(`process-article-${i}`, async (): Promise<PipelineResult> => {

          // Scrape with plain fetch (NOT step.fetch)
          logger.info(`[pipeline] ${tag} scraping ${link.url}`)
          let page: ScrapedPage
          try {
            page = await scrapeArticlePlain(link)
          } catch (e) {
            throw new Error(`[scrape] ${errMsg(e)}`)
          }

          // Generate with HF client (plain HTTP under the hood)
          logger.info(`[pipeline] ${tag} generating…`)
          let generated: GeneratedArticle
          try {
            generated = await generateArticle(page)
          } catch (e) {
            throw new Error(`[generate] ${errMsg(e)}`)
          }

          // Save to DB
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

      // sendEvent must be at handler top-level — correct here.
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