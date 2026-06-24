export type ArticleVisibility = 'public' | 'unlisted' | 'members'
export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived'
export type TwitterCard = 'summary_large_image' | 'summary' | 'app'

export interface NewsArticle {
  id: string
  title: string
  description: string
  content: string
  category: string
  author: string
  date: Date | string
  image: string
  readTime: number
  featured?: boolean
  breaking?: boolean
  trending?: boolean
  views: number
  slug: string
  sourceUrl?: string | null
  seoTitle?: string | null
  metaDescription?: string | null
  focusKeyword?: string | null
  canonicalUrl?: string | null
  ogImage?: string | null
  twitterCard?: TwitterCard
  noIndex?: boolean
  allowComments?: boolean
  showInRss?: boolean
  ampEnabled?: boolean
  redirectUrl?: string | null
  cssClass?: string | null
  visibility?: ArticleVisibility
  scheduledAt?: Date | null
  status?: ArticleStatus
  updatedAt?: Date | string
}

export type CreateArticleInput = Omit<NewsArticle, 'id' | 'slug' | 'views' | 'updatedAt'>
export type UpdateArticleInput = Partial<CreateArticleInput>

const BASE = '/api'

async function apiFetch(path: string) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function getAllArticles(limit = 10, offset = 0): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles?limit=${limit}&offset=${offset}`) }
  catch { return [] }
}

export async function getPublishedArticles(): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles?status=published`) }
  catch { return [] }
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  try { return await apiFetch(`/articles/by-slug/${encodeURIComponent(slug)}`) }
  catch { return null }
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  try { return await apiFetch(`/articles/${encodeURIComponent(id)}`) }
  catch { return null }
}

export async function getArticlesByCategory(category: string): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles?category=${encodeURIComponent(category)}&status=published`) }
  catch { return [] }
}

export async function getFeaturedArticles(): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles?featured=true&status=published`) }
  catch { return [] }
}

export async function getBreakingNews(): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles?breaking=true&status=published`) }
  catch { return [] }
}

export async function getTrendingArticles(): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles?trending=true&status=published`) }
  catch { return [] }
}

export async function searchArticles(query: string): Promise<NewsArticle[]> {
  try { return await apiFetch(`/articles/search?q=${encodeURIComponent(query)}`) }
  catch { return [] }
}

export async function searchArticlesByQuery(query: string): Promise<NewsArticle[]> {
  return searchArticles(query)
}

export async function incrementArticleViews(_id: string): Promise<void> {
  // Handled server-side when article is fetched by slug
}

export async function getArticleBySourceUrl(_url: string): Promise<NewsArticle | null> {
  return null
}

export async function getArticleByTitle(_title: string): Promise<NewsArticle | null> {
  return null
}

export async function createArticle(_input: CreateArticleInput): Promise<NewsArticle | null> {
  return null
}

export async function updateArticle(_id: string, _input: UpdateArticleInput): Promise<NewsArticle | null> {
  return null
}

export async function deleteArticle(_id: string): Promise<boolean> {
  return false
}

export async function getUniqueArticleDates(): Promise<string[]> {
  return []
}

export async function getArticlesByDate(_date: string): Promise<NewsArticle[]> {
  return []
}

export const categories = ['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health', 'World'] as const
export type Category = typeof categories[number]
