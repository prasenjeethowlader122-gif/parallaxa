import { sql } from '@/lib/db';
import { NewsArticle, mapRow } from '@/lib/db/articles';

export async function getAuthorById(id: string) {
  try {
    const author = await sql`
      SELECT id, name, image, bio, role, created_at
      FROM users
      WHERE id = ${id}
    `;
    return author[0] || null;
  } catch (e) {
    console.error('getAuthorById:', e);
    return null;
  }
}

export async function getAuthorStats(id: string) {
  try {
    const articleCount = await sql`SELECT COUNT(*) FROM articles WHERE user_id = ${id}`;
    const viewCount = await sql`SELECT SUM(views) FROM articles WHERE user_id = ${id}`;

    return {
      articles: parseInt(articleCount[0]?.count ?? '0', 10),
      views: parseInt(viewCount[0]?.sum || '0', 10)
    };
  } catch (e) {
    console.error('getAuthorStats:', e);
    return { articles: 0, views: 0 };
  }
}

export async function getArticlesByAuthor(id: string) {
  try {
    const rows = await sql`
      SELECT *
      FROM articles
      WHERE user_id = ${id} AND status = 'published'
      ORDER BY date DESC
    `;
    return rows.map((r: any) => mapRow(r)).filter(Boolean) as NewsArticle[];
  } catch (e) {
    console.error('getArticlesByAuthor:', e);
    return [];
  }
}
