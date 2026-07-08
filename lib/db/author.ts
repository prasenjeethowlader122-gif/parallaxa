
import { sql } from '@/lib/db';

export async function getAuthorById(id: string) {
  const author = await sql`
    SELECT id, name, image, bio, role, created_at
    FROM users
    WHERE id = ${id}
  `;
  return author[0] || null;
}

export async function getAuthorStats(id: string) {
  const articleCount = await sql`SELECT COUNT(*) FROM articles WHERE author_id = ${id}`;
  const viewCount = await sql`SELECT SUM(views) FROM articles WHERE author_id = ${id}`;

  return {
    articles: parseInt(articleCount[0].count),
    views: parseInt(viewCount[0].sum || '0')
  };
}

export async function getArticlesByAuthor(id: string) {
  return await sql`
    SELECT id, title, slug, summary, thumbnail, views, category_id, created_at
    FROM articles
    WHERE author_id = ${id} AND status = 'published'
    ORDER BY created_at DESC
  `;
}
