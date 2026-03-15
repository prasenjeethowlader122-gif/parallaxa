import { sql } from './index';
import { neon } from '@neondatabase/serverless';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  // SEO
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  canonicalUrl?: string;
  ogImage?: string;
  twitterCard?: 'summary_large_image' | 'summary' | 'app';
  // Advanced
  noIndex?: boolean;
  allowComments?: boolean;
  showInRss?: boolean;
  ampEnabled?: boolean;
  redirectUrl?: string;
  cssClass?: string;
  visibility?: 'public' | 'unlisted' | 'members';
  scheduledAt?: Date | null;
  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  updatedAt?: Date;
}

export type CreateArticleInput = Omit<NewsArticle, 'id' | 'slug' | 'views' | 'updatedAt'>;
export type UpdateArticleInput = Partial<CreateArticleInput>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRow(row: any): NewsArticle | null {
  if (!row || !row.id) {
    console.error('mapRow received invalid row:', JSON.stringify(row));
    return null;
  }
  return {
    id:               row.id,
    title:            row.title            ?? '',
    description:      row.description      ?? '',
    content:          row.content          ?? '',
    category:         row.category         ?? '',
    author:           row.author           ?? '',
    date:             row.date             ? new Date(row.date) : new Date(),
    image:            row.image            ?? '',
    readTime:         row.read_time        ?? 0,
    featured:         row.featured         ?? false,
    breaking:         row.breaking         ?? false,
    trending:         row.trending         ?? false,
    views:            row.views            ?? 0,
    slug:             row.slug             ?? '',
    // SEO
    seoTitle:         row.seo_title        ?? null,
    metaDescription:  row.meta_description ?? null,
    focusKeyword:     row.focus_keyword    ?? null,
    canonicalUrl:     row.canonical_url    ?? null,
    ogImage:          row.og_image         ?? null,
    twitterCard:      row.twitter_card     ?? 'summary_large_image',
    // Advanced
    noIndex:          row.no_index         ?? false,
    allowComments:    row.allow_comments   ?? true,
    showInRss:        row.show_in_rss      ?? true,
    ampEnabled:       row.amp_enabled      ?? false,
    redirectUrl:      row.redirect_url     ?? null,
    cssClass:         row.css_class        ?? null,
    visibility:       row.visibility       ?? 'public',
    scheduledAt:      row.scheduled_at     ? new Date(row.scheduled_at) : null,
    status:           row.status           ?? 'draft',
    updatedAt:        row.updated_at       ? new Date(row.updated_at) : undefined,
  };
}

function filterRows(rows: any[]): NewsArticle[] {
  return rows.map(mapRow).filter((a): a is NewsArticle => a !== null);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAllArticles(): Promise<NewsArticle[]> {
  try {
    const rows = await sql`SELECT * FROM articles ORDER BY date DESC`;
    return filterRows(rows);
  } catch (error) {
    console.error('getAllArticles error:', error);
    return [];
  }
}

export async function getPublishedArticles(): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles
      WHERE status = 'published'
      ORDER BY date DESC
    `;
    return filterRows(rows);
  } catch (error) {
    console.error('getPublishedArticles error:', error);
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  try {
    const rows = await sql`SELECT * FROM articles WHERE slug = ${slug} LIMIT 1`;
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    console.error('getArticleBySlug error:', error);
    return null;
  }
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  try {
    const rows = await sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1`;
    return rows[0] ? mapRow(rows[0]) : null;
  } catch (error) {
    console.error('getArticleById error:', error);
    return null;
  }
}

export async function getArticlesByCategory(category: string): Promise<NewsArticle[]> {
  try {
    const rows = await sql`
      SELECT * FROM articles
      WHERE category = ${category} AND status = 'published'
      ORDER BY date DESC
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
      WHERE featured = TRUE AND status = 'published'
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
      WHERE breaking = TRUE AND status = 'published'
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
      WHERE trending = TRUE AND status = 'published'
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
      WHERE (title ILIKE ${q} OR description ILIKE ${q} OR content ILIKE ${q})
        AND status = 'published'
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
    await sql`UPDATE articles SET views = views + 1 WHERE id = ${id}`;
  } catch (error) {
    console.error('incrementArticleViews error:', error);
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createArticle(input: CreateArticleInput): Promise<NewsArticle | null> {
  try {
    const rows = await sql`
      INSERT INTO articles (
        title, description, content, category, author, date, image, read_time,
        featured, breaking, trending,
        seo_title, meta_description, focus_keyword, canonical_url, og_image, twitter_card,
        no_index, allow_comments, show_in_rss, amp_enabled,
        redirect_url, css_class, visibility, scheduled_at, status
      ) VALUES (
        ${input.title},
        ${input.description},
        ${input.content},
        ${input.category},
        ${input.author},
        ${input.date.toISOString()},
        ${input.image},
        ${input.readTime},
        ${input.featured  ?? false},
        ${input.breaking  ?? false},
        ${input.trending  ?? false},
        ${input.seoTitle         ?? null},
        ${input.metaDescription  ?? null},
        ${input.focusKeyword     ?? null},
        ${input.canonicalUrl     ?? null},
        ${input.ogImage          ?? null},
        ${input.twitterCard      ?? 'summary_large_image'},
        ${input.noIndex          ?? false},
        ${input.allowComments    ?? true},
        ${input.showInRss        ?? true},
        ${input.ampEnabled       ?? false},
        ${input.redirectUrl      ?? null},
        ${input.cssClass         ?? null},
        ${input.visibility       ?? 'public'},
        ${input.scheduledAt      ? input.scheduledAt.toISOString() : null},
        ${input.status           ?? 'draft'}
      )
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
  input: UpdateArticleInput
): Promise<NewsArticle | null> {
  try {
    const fieldMap: Record<string, string> = {
      title:           'title',
      description:     'description',
      content:         'content',
      category:        'category',
      author:          'author',
      date:            'date',
      image:           'image',
      readTime:        'read_time',
      featured:        'featured',
      breaking:        'breaking',
      trending:        'trending',
      seoTitle:        'seo_title',
      metaDescription: 'meta_description',
      focusKeyword:    'focus_keyword',
      canonicalUrl:    'canonical_url',
      ogImage:         'og_image',
      twitterCard:     'twitter_card',
      noIndex:         'no_index',
      allowComments:   'allow_comments',
      showInRss:       'show_in_rss',
      ampEnabled:      'amp_enabled',
      redirectUrl:     'redirect_url',
      cssClass:        'css_class',
      visibility:      'visibility',
      scheduledAt:     'scheduled_at',
      status:          'status',
    };

    const fields: string[] = [];
    const values: any[]   = [];

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in input) {
        fields.push(col);
        const raw = (input as any)[key];
        if ((key === 'date' || key === 'scheduledAt') && raw instanceof Date) {
          values.push(raw.toISOString());
        } else {
          // Fix: preserve explicit null (e.g. clearing scheduledAt) rather than
          // coercing it; only fall back to null for true undefined.
          values.push(raw !== undefined ? raw : null);
        }
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

    // Fix: reuse the module-level sql connection instead of re-instantiating
    // neon() on every call (which creates a new connection pool each time).
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
    const rows = await sql`DELETE FROM articles WHERE id = ${id} RETURNING id`;
    return rows.length > 0;
  } catch (error) {
    console.error('deleteArticle error:', error);
    return false;
  }
}

export const categories = [
  'Business', 'Technology', 'Sports',
  'Entertainment', 'Science', 'Health', 'World',
] as const;

export type Category = typeof categories[number];