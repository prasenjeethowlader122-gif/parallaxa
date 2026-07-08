
import { sql } from '@/lib/db';
import { NewsArticle } from '@/lib/db/articles';

export async function getLatestArticles(limit: number = 10) {
  return await sql`
    SELECT id, title, slug, summary, thumbnail, views, category_id, author_id, created_at, status
    FROM articles
    WHERE status = 'published'
    ORDER BY created_at DESC
    LIMIT ${limit}
  ` as NewsArticle[];
}

export async function getArticlesByCategory(categoryId: number, limit: number = 10) {
  return await sql`
    SELECT id, title, slug, summary, thumbnail, views, category_id, author_id, created_at, status
    FROM articles
    WHERE category_id = ${categoryId} AND status = 'published'
    ORDER BY created_at DESC
    LIMIT ${limit}
  ` as NewsArticle[];
}
