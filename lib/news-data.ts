/**
 * This file is kept as a thin re-export shim so that existing imports of
 * `@/lib/news-data` continue to work without touching every consumer file.
 *
 * All logic now lives in `@/lib/db/articles`.
 */
export type { NewsArticle } from './db/articles';

export {
  categories,
  getAllArticles,
  getArticleById,
  getArticleBySlug,
  getArticlesByCategory,
  getFeaturedArticles,
  getBreakingNews,
  getTrendingArticles,
  searchArticles,
  incrementArticleViews,
  createArticle,
  updateArticle,
  deleteArticle,
} from './db/articles';