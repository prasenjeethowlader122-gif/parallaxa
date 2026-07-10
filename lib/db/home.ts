import { sql } from '@/lib/db';
import { NewsArticle, mapRow } from '@/lib/db/articles';

const CATEGORIES_MAP: Record<number, string> = {
  1: 'Business',
  2: 'Technology',
  3: 'Sports',
  4: 'Entertainment',
  5: 'Science',
  6: 'Health',
  7: 'World',
};

export async function getLatestArticles(limit: number = 10) {
  try {
    const rows = await sql`
      SELECT *
      FROM articles
      WHERE status = 'published'
      ORDER BY date DESC
      LIMIT ${limit}
    `;
    return rows.map((r: any) => mapRow(r)).filter(Boolean) as NewsArticle[];
  } catch (e) {
    console.error('getLatestArticles:', e);
    return [];
  }
}

export async function getArticlesByCategory(categoryId: number, limit: number = 10) {
  const categoryName = CATEGORIES_MAP[categoryId] || 'World';
  try {
    const rows = await sql`
      SELECT *
      FROM articles
      WHERE category = ${categoryName} AND status = 'published'
      ORDER BY date DESC
      LIMIT ${limit}
    `;
    return rows.map((r: any) => mapRow(r)).filter(Boolean) as NewsArticle[];
  } catch (e) {
    console.error('getArticlesByCategory:', e);
    return [];
  }
}
