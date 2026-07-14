import { sql } from '@/lib/db';
import { NewsArticle, mapRow } from '@/lib/db/articles';

export async function getMappedCategories() {
  const defaultCats = ['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health', 'World'];
  try {
    const rows = await sql`
      SELECT DISTINCT category FROM articles
      WHERE category IS NOT NULL AND category <> ''
    `;
    const dbCats = rows.map((r: any) => r.category as string);
    // Merge and deduplicate (case-insensitive deduplication)
    const allCatsMap = new Map<string, string>();
    defaultCats.forEach(c => allCatsMap.set(c.toLowerCase(), c));
    dbCats.forEach(c => {
      const trimmed = c.trim();
      if (trimmed) {
        allCatsMap.set(trimmed.toLowerCase(), trimmed);
      }
    });
    const sortedCats = Array.from(allCatsMap.values()).sort((a, b) => a.localeCompare(b));
    return sortedCats.map((name, index) => ({
      id: index + 1,
      name
    }));
  } catch (e) {
    console.error('getMappedCategories failed:', e);
    return defaultCats.map((name, index) => ({
      id: index + 1,
      name
    }));
  }
}

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
  try {
    const cats = await getMappedCategories();
    const categoryName = cats.find(c => c.id === categoryId)?.name || 'World';
    const rows = await sql`
      SELECT *
      FROM articles
      WHERE LOWER(category) = LOWER(${categoryName}) AND status = 'published'
      ORDER BY date DESC
      LIMIT ${limit}
    `;
    return rows.map((r: any) => mapRow(r)).filter(Boolean) as NewsArticle[];
  } catch (e) {
    console.error('getArticlesByCategory:', e);
    return [];
  }
}
