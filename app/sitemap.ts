import type { MetadataRoute } from 'next'
import { getUniqueArticleDates, getArticlesByDate } from '@/lib/db/articles'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'

/**
 * generateSitemaps returns the "IDs" for all sub-sitemaps.
 * Resulting URLs: /sitemap/main.xml, /sitemap/2026-03-30.xml, etc.
 */
export async function generateSitemaps() {
  const dates = await getUniqueArticleDates()
  
  return [
    { id: 'main' }, // For static pages and categories
    ...dates.map((date) => ({ id: date })),
  ]
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  // ── CASE 1: Main Sitemap (Static & Categories) ───────────────────────────
  if (id === 'main') {
    const categories = ['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health', 'World']
    
    const staticRoutes: MetadataRoute.Sitemap = [
      { url: BASE_URL, lastModified: new Date(), priority: 1, changeFrequency: 'hourly' },
      { url: `${BASE_URL}/search`, lastModified: new Date(), priority: 0.5 },
    ]

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
      url: `${BASE_URL}/category/${encodeURIComponent(cat)}`,
      lastModified: new Date(),
      priority: 0.8,
      changeFrequency: 'daily',
    }))

    return [...staticRoutes, ...categoryRoutes]
  }

  // ── CASE 2: Daily Article Sitemaps ───────────────────────────────────────
  // 'id' is the date string (e.g., "2026-03-30")
  const articles = await getArticlesByDate(id)

  return articles.map((article) => ({
    url: `${BASE_URL}/article/${article.slug}`,
    lastModified: article.updatedAt ?? article.date,
    changeFrequency: 'monthly', // Historical dates rarely change
    priority: article.featured ? 0.9 : article.trending ? 0.85 : 0.7,
  }))
}

// Optional: Force revalidation every hour
export const revalidate = 3600