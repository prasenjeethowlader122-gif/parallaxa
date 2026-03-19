import type { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/db/articles'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static routes ──────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  // ── Category routes ────────────────────────────────────────────────────────
  const categories = [
    'Business',
    'Technology',
    'Sports',
    'Entertainment',
    'Science',
    'Health',
    'World',
  ]

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE_URL}/category/${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: 'hourly',
    priority: 0.8,
  }))

  // ── Article routes (dynamic, from DB) ─────────────────────────────────────
  let articleRoutes: MetadataRoute.Sitemap = []
  try {
    const articles = await getPublishedArticles()
    articleRoutes = articles
      .filter((a) => a.slug && !a.noIndex)
      .map((article) => ({
        url: `${BASE_URL}/article/${article.slug}`,
        lastModified: article.updatedAt ?? article.date,
        changeFrequency: 'weekly' as const,
        priority: article.featured ? 0.9 : article.trending ? 0.85 : 0.7,
      }))
  } catch (e) {
    console.error('[sitemap] Failed to fetch articles:', e)
  }

  return [...staticRoutes, ...categoryRoutes, ...articleRoutes]
}