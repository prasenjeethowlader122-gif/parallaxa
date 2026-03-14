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

function mapRow(row: any): NewsArticle {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    category: row.category,
    author: row.author,
    date: new Date(row.date),
    image: row.image,
    readTime: row.read_time,
    featured: row.featured,
    breaking: row.breaking,
    trending: row.trending,
    views: row.views,
    slug: row.slug,
  };
}

// ── queries ──────────────────────────────────────────────

export async function getAllArticles(): Promise<NewsArticle[]> {
  const rows = await sql`
    SELECT * FROM articles ORDER BY date DESC
  `;
  return rows.map(mapRow);
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const rows = await sql`
    SELECT * FROM articles WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  const rows = await sql`
    SELECT * FROM articles WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getArticlesByCategory(category: string): Promise<NewsArticle[]> {
  const rows = await sql`
    SELECT * FROM articles WHERE category = ${category} ORDER BY date DESC
  `;
  return rows.map(mapRow);
}

export async function getFeaturedArticles(): Promise<NewsArticle[]> {
  const rows = await sql`
    SELECT * FROM articles
    WHERE featured = TRUE
    ORDER BY views DESC
    LIMIT 3
  `;
  return rows.map(mapRow);
}

export async function getBreakingNews(): Promise<NewsArticle[]> {
  const rows = await sql`
    SELECT * FROM articles
    WHERE breaking = TRUE
    ORDER BY date DESC
    LIMIT 3
  `;
  return rows.map(mapRow);
}

export async function getTrendingArticles(): Promise<NewsArticle[]> {
  const rows = await sql`
    SELECT * FROM articles
    WHERE trending = TRUE
    ORDER BY views DESC
    LIMIT 5
  `;
  return rows.map(mapRow);
}

export async function searchArticles(query: string): Promise<NewsArticle[]> {
  const q = `%${query}%`;
  const rows = await sql`
    SELECT * FROM articles
    WHERE title ILIKE ${q}
       OR description ILIKE ${q}
       OR content ILIKE ${q}
    ORDER BY date DESC
  `;
  return rows.map(mapRow);
}

export async function incrementArticleViews(id: string): Promise<void> {
  await sql`
    UPDATE articles SET views = views + 1 WHERE id = ${id}
  `;
}

// ── mutations ─────────────────────────────────────────────

export type CreateArticleInput = Omit<NewsArticle, 'id' | 'slug' | 'views'>;

export async function createArticle(input: CreateArticleInput): Promise<NewsArticle> {
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
  return mapRow(rows[0]);
}

export async function updateArticle(
  id: string,
  input: Partial<CreateArticleInput>
): Promise<NewsArticle | null> {
  // Build the update dynamically only for provided fields
  const fields: string[] = [];
  const values: any[] = [];

  const fieldMap: Record<string, string> = {
    title: 'title', description: 'description', content: 'content',
    category: 'category', author: 'author', date: 'date', image: 'image',
    readTime: 'read_time', featured: 'featured', breaking: 'breaking', trending: 'trending',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in input) {
      fields.push(col);
      values.push(key === 'date' ? (input as any)[key].toISOString() : (input as any)[key]);
    }
  }

  if (fields.length === 0) return getArticleById(id);

  // Build parameterised query using neon tagged-template literal approach
  // We use a raw approach since neon's sql tag doesn't support dynamic SET clauses natively
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
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM articles WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}

export const categories = [
  'Business', 'Technology', 'Sports',
  'Entertainment', 'Science', 'Health',
] as const;