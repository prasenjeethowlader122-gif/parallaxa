import { sql } from './index';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  author: string;
  date: Date;
  image: string;
  readTime: number;
  featured?: boolean;
  breaking?: boolean;
  trending?: boolean;
  views: number;
  slug: string;
}

// ── helpers ──────────────────────────────────────────────

function mapRow(row: any): NewsArticle | null {
  if (!row || !row.id) {
    console.error('mapRow received invalid row:', JSON.stringify(row));
    return null;
  }
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    content: row.content ?? '',
    category: row.category ?? '',
    author: row.author ?? '',
    date: row.date ? new Date(row.date) : new Date(),
    image: row.image ?? '',
    readTime: row.read_time ?? 0,
    featured: row.featured ?? false,
    breaking: row.breaking ?? false,
    trending: row.trending ?? false,
    views: row.views ?? 0,
    slug: row.slug ?? '',
  };
}

function filterRows(rows: any[]): NewsArticle[] {
  return rows.map(mapRow).filter((a): a is NewsArticle => a !== null);
}

// ── queries ──────────────────────────────────────────────

export async function getAllArticles(): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles ORDER BY date DESC
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('getAllArticles error:', error);
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  try {
    const rows = await sql`
      SELECT * FROM articles WHERE slug = ${slug} LIMIT 1
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    console.error('getArticleBySlug error:', error);
    return null;
  }
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const rows = await sql`
      SELECT * FROM articles WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    console.error('getArticleById error:', error);
    return null;
  }
}

export async function getArticlesByCategory(category: string): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles WHERE category = ${category} ORDER BY date DESC
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('getArticlesByCategory error:', error);
    return [];
  }
}

export async function getFeaturedArticles(): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles
      WHERE featured = TRUE
      ORDER BY views DESC
      LIMIT 3
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('getFeaturedArticles error:', error);
    return [];
  }
}

export async function getBreakingNews(): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles
      WHERE breaking = TRUE
      ORDER BY date DESC
      LIMIT 3
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('getBreakingNews error:', error);
    return [];
  }
}

export async function getTrendingArticles(): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles
      WHERE trending = TRUE
      ORDER BY views DESC
      LIMIT 5
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('getTrendingArticles error:', error);
    return [];
  }
}

export async function searchArticles(query: string): Promise<NewsArticle[]> {
  try {
    const q = `%${query}%`;
    const rows = await sql`
      SELECT * FROM articles
      WHERE title ILIKE ${q}
         OR description ILIKE ${q}
         OR content ILIKE ${q}
      ORDER BY date DESC
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('searchArticles error:', error);
    return [];
  }
}

export async function incrementArticleViews(id: string): Promise<void> {
  try {
    await sql`
      UPDATE articles SET views = views + 1 WHERE id = ${id}
    `;
  } catch (error) {
    console.error('incrementArticleViews error:', error);
  }
}

// ── mutations ─────────────────────────────────────────────

export type CreateArticleInput = Omit<NewsArticle, 'id' | 'slug' | 'views'>;

export async function createArticle(input: CreateArticleInput): Promise<NewsArticle | null> {
  try {
    const rows = await sql`
      INSERT INTO articles
        (title, description, content, category, author, date, image, read_time,
         featured, breaking, trending)
      VALUES
        (${input.title}, ${input.description}, ${input.content}, ${input.category},
         ${input.author}, ${input.date.toISOString()}, ${input.image}, ${input.readTime},
         ${input.featured ?? false}, ${input.breaking ?? false}, ${input.trending ?? false})
      RETURNING *
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    console.error('createArticle error:', error);
    return null;
  }
}

export async function updateArticle(
  id: string,
  input: Partial<CreateArticleInput>
): Promise<NewsArticle | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      content: 'content',
      category: 'category',
      author: 'author',
      date: 'date',
      image: 'image',
      readTime: 'read_time',
      featured: 'featured',
      breaking: 'breaking',
      trending: 'trending',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in input) {
        fields.push(col);
        values.push(key === 'date' ? (input as any)[key].toISOString() : (input as any)[key]);
      }
    }

    if (fields.length === 0) return getArticleById(id);

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const queryText = `
      UPDATE articles
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;

    const { neon } = await import('@neondatabase/serverless');
    const rawSql = neon(process.env.DATABASE_URL!);
    const rows = await rawSql(queryText, [...values, id]);
    return rows[0] ? mapRow(rows[0] as any) : null;
  } catch (error) {
    console.error('updateArticle error:', error);
    return null;
  }
}

export async function deleteArticle(id: string): Promise<boolean> {
  try {
    const rows = await sql`
      DELETE FROM articles WHERE id = ${id} RETURNING id
    `;
    return rows.length > 0;
  } catch (error) {
    console.error('deleteArticle error:', error);
    return false;
  }
}

export const categories = [
  'Business', 'Technology', 'Sports',
  'Entertainment', 'Science', 'Health' , 'World',
] as const;