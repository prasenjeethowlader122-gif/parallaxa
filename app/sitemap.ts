import type { MetadataRoute } from 'next'
import { getUniqueArticleDates, getArticlesByDate } from '@/lib/db/articles'

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '') // strip trailing slash — prevents double-slash URLs

const CATEGORIES = [
  'Business',
  'Technology',
  'Sports',
  'Entertainment',
  'Science',
  'Health',
  'World',
] as const

// ── Security: validate date param before any DB call ─────────────────────────
const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

function isValidDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false
  // Also verify the date actually exists (e.g. rejects 2024-02-30)
  const d = new Date(s)
  return !isNaN(d.getTime())
}

// ── generateSitemaps ─────────────────────────────────────────────────────────
/**
 * Returns the IDs for all sub-sitemaps.
 * Next.js routes them as:
 *   /sitemap/0          → main  (static pages + categories)
 *   /sitemap/1 … N      → one per published date
 *
 * We use numeric IDs so Next.js can build /sitemap/[id].xml automatically.
 * We store the mapping externally so sitemap() can look up what each ID means.
 */
export async function generateSitemaps() {
  const dates = await getUniqueArticleDates()
  // id 0  → 'main'
  // id 1+ → dates[0], dates[1], …
  return [
    { id: 0 },
    ...dates.map((_, i) => ({ id: i + 1 })),
  ]
}

// Cache the date list for the lifetime of the lambda invocation so
// sitemap(id=N) doesn't re-query the DB for every chunk.
let _cachedDates: string[] | null = null

async function getCachedDates(): Promise<string[]> {
  if (!_cachedDates) {
    _cachedDates = await getUniqueArticleDates()
  }
  return _cachedDates
}

// ── Sitemap generator ────────────────────────────────────────────────────────
export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  // ── CASE 1: Main sitemap (static routes + categories) ─────────────────────
  if (id === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      {
        url: BASE_URL,
        lastModified: new Date(),
        priority: 1.0,
        changeFrequency: 'hourly',
      },
      {
        url: `${BASE_URL}/search`,
        lastModified: new Date(),
        priority: 0.5,
        changeFrequency: 'weekly',
      },
    ]

    const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
      url: `${BASE_URL}/category/${encodeURIComponent(cat.toLowerCase())}`,
      lastModified: new Date(),
      priority: 0.8,
      changeFrequency: 'daily' as const,
    }))

    return [...staticRoutes, ...categoryRoutes]
  }

  // ── CASE 2: Per-date article sitemaps ──────────────────────────────────────
  const dates = await getCachedDates()
  const dateString = dates[id - 1] // id=1 → dates[0], id=2 → dates[1], …

  // Security: reject anything that isn't a real date string
  if (!dateString || !isValidDate(dateString)) {
    console.warn(`[sitemap] invalid or out-of-range id: ${id}`)
    return []
  }

  const articles = await getArticlesByDate(dateString)

  return articles.map((article) => ({
    url: `${BASE_URL}/article/${article.slug}`,
    lastModified: article.updatedAt ?? article.date,
    changeFrequency: 'monthly' as const, // historical content rarely changes
    priority: article.featured ? 0.9 : article.trending ? 0.85 : 0.7,
    // images block gives Google rich image indexing signals
    ...(article.ogImage || article.image
      ? {
          images: [
            {
              url: article.ogImage ?? article.image,
              title: article.title,
            },
          ],
        }
      : {}),
  }))
}

// Revalidate every hour so new articles appear in sitemaps quickly
export const revalidate = 3600