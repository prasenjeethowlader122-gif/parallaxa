/**
 * Thin re-export shim so existing imports of `@/lib/news-data` keep working.
 * All logic lives in `@/lib/db/articles`.
 */
export type { NewsArticle, CreateArticleInput, UpdateArticleInput, Category } from './db/articles'

export {
  categories,
  getAllArticles,
  getPublishedArticles,
  getArticleById,
  getArticleBySlug,
  getArticlesByCategory,
  getFeaturedArticles,
  searchArticlesByQuery,
  getBreakingNews,
  getTrendingArticles,
  searchArticles,
  incrementArticleViews,
  createArticle,
  updateArticle,
  deleteArticle,
} from './db/articles'
