import { sql } from './index'
import { neon } from '@neondatabase/serverless'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArticleVisibility = 'public' | 'unlisted' | 'members'
export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived'
export type TwitterCard = 'summary_large_image' | 'summary' | 'app'

export interface NewsArticle {
  id: string
  title: string
  description: string
  content: string
  category: string
  author: string
  date: Date
  image: string
  readTime: number
  featured ? : boolean
  breaking ? : boolean
  trending ? : boolean
  views: number
  slug: string
  sourceUrl ? : string | null // ✅ NEW — stores original scrape URL for duplicate detection
  // SEO
  seoTitle ? : string | null
  metaDescription ? : string | null
  focusKeyword ? : string | null
  canonicalUrl ? : string | null
  ogImage ? : string | null
  twitterCard ? : TwitterCard
  // Advanced
  noIndex ? : boolean
  allowComments ? : boolean
  showInRss ? : boolean
  ampEnabled ? : boolean
  redirectUrl ? : string | null
  cssClass ? : string | null
  visibility ? : ArticleVisibility
  scheduledAt ? : Date | null
  status ? : ArticleStatus
  updatedAt ? : Date
}

export type CreateArticleInput = Omit < NewsArticle, 'id' | 'slug' | 'views' | 'updatedAt' > & {
  embedding ? : number[] | string
}
export type UpdateArticleInput = Partial < CreateArticleInput >
  
  // ── Helpers ───────────────────────────────────────────────────────────────────
  
  function mapRow(row: Record < string, unknown > ): NewsArticle | null {
    if (!row?.id) { console.error('mapRow: invalid row', JSON.stringify(row)); return null }
    return {
      id: row.id as string,
      title: (row.title as string) ?? '',
      description: (row.description as string) ?? '',
      content: (row.content as string) ?? '',
      category: (row.category as string) ?? '',
      author: (row.author as string) ?? '',
      date: row.date ? new Date(row.date as string) : new Date(),
      image: (row.image as string) ?? '',
      readTime: (row.read_time as number) ?? 0,
      featured: (row.featured as boolean) ?? false,
      breaking: (row.breaking as boolean) ?? false,
      trending: (row.trending as boolean) ?? false,
      views: (row.views as number) ?? 0,
      slug: (row.slug as string) ?? '',
      sourceUrl: (row.source_url as string) ?? null, // ✅ NEW
      seoTitle: (row.seo_title as string) ?? null,
      metaDescription: (row.meta_description as string) ?? null,
      focusKeyword: (row.focus_keyword as string) ?? null,
      canonicalUrl: (row.canonical_url as string) ?? null,
      ogImage: (row.og_image as string) ?? null,
      twitterCard: (row.twitter_card as TwitterCard) ?? 'summary_large_image',
      noIndex: (row.no_index as boolean) ?? false,
      allowComments: (row.allow_comments as boolean) ?? true,
      showInRss: (row.show_in_rss as boolean) ?? true,
      ampEnabled: (row.amp_enabled as boolean) ?? false,
      redirectUrl: (row.redirect_url as string) ?? null,
      cssClass: (row.css_class as string) ?? null,
      visibility: (row.visibility as ArticleVisibility) ?? 'public',
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at as string) : null,
      status: (row.status as ArticleStatus) ?? 'draft',
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
    }
  }

const filterRows = (rows: Record < string, unknown > []): NewsArticle[] =>
  rows.map(mapRow).filter((a): a is NewsArticle => a !== null)

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAllArticles(): Promise < NewsArticle[] > {
  try { return filterRows(await sql`SELECT * FROM articles ORDER BY date DESC`) }
  catch (e) { console.error('getAllArticles:', e); return [] }
}

export async function getPublishedArticles(): Promise < NewsArticle[] > {
  try { return filterRows(await sql`SELECT * FROM articles WHERE status = 'published' ORDER BY date DESC`) }
  catch (e) { console.error('getPublishedArticles:', e); return [] }
}

export async function getArticleBySlug(slug: string): Promise < NewsArticle | null > {
  try { const r = await sql`SELECT * FROM articles WHERE slug = ${slug} LIMIT 1`; return r[0] ? mapRow(r[0]) : null }
  catch (e) { console.error('getArticleBySlug:', e); return null }
}

export async function getArticleById(id: string): Promise < NewsArticle | null > {
  try { const r = await sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1`; return r[0] ? mapRow(r[0]) : null }
  catch (e) { console.error('getArticleById:', e); return null }
}

export async function getArticlesByCategory(category: string): Promise < NewsArticle[] > {
  try { return filterRows(await sql`SELECT * FROM articles WHERE category = ${category} AND status = 'published' ORDER BY date DESC`) }
  catch (e) { console.error('getArticlesByCategory:', e); return [] }
}

export async function getFeaturedArticles(): Promise < NewsArticle[] > {
  try { return filterRows(await sql`SELECT * FROM articles WHERE featured = TRUE AND status = 'published' ORDER BY views DESC LIMIT 3`) }
  catch (e) { console.error('getFeaturedArticles:', e); return [] }
}

export async function getBreakingNews(): Promise < NewsArticle[] > {
  try { return filterRows(await sql`SELECT * FROM articles WHERE breaking = TRUE AND status = 'published' ORDER BY date DESC LIMIT 3`) }
  catch (e) { console.error('getBreakingNews:', e); return [] }
}

export async function getTrendingArticles(): Promise < NewsArticle[] > {
  try { return filterRows(await sql`SELECT * FROM articles WHERE trending = TRUE AND status = 'published' ORDER BY views DESC LIMIT 5`) }
  catch (e) { console.error('getTrendingArticles:', e); return [] }
}

export async function searchArticles(query: string): Promise < NewsArticle[] > {
  try {
    const q = `%${query}%`
    return filterRows(await sql`
      SELECT * FROM articles
      WHERE (title ILIKE ${q} OR description ILIKE ${q} OR content ILIKE ${q})
        AND status = 'published'
      ORDER BY date DESC`)
  } catch (e) { console.error('searchArticles:', e); return [] }
}

export async function incrementArticleViews(id: string): Promise < void > {
  try { await sql`UPDATE articles SET views = views + 1 WHERE id = ${id}` }
  catch (e) { console.error('incrementArticleViews:', e) }
}

// ── Duplicate Detection Queries ───────────────────────────────────────────────

/**
 * Layer 1 — Exact URL match.
 * Fastest check; catches re-runs of the same source article.
 */
export async function getArticleBySourceUrl(url: string): Promise < NewsArticle | null > {
  try {
    const r = await sql`SELECT * FROM articles WHERE source_url = ${url} LIMIT 1`
    return r[0] ? mapRow(r[0]) : null
  } catch (e) { console.error('getArticleBySourceUrl:', e); return null }
}

/**
 * Layer 2 — Case-insensitive title match.
 * Catches same story scraped from a different URL.
 */
export async function getArticleByTitle(title: string): Promise < NewsArticle | null > {
  try {
    const r = await sql`
      SELECT * FROM articles WHERE LOWER(title) = LOWER(${title}) LIMIT 1
    `
    return r[0] ? mapRow(r[0]) : null
  } catch (e) { console.error('getArticleByTitle:', e); return null }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createArticle(input: CreateArticleInput): Promise < NewsArticle | null > {
  try {
    // Convert number[] embedding → pgvector literal '[0.1,0.2,...]'
    const embeddingValue = input.embedding ?
      (Array.isArray(input.embedding) ?
        `[${(input.embedding as number[]).join(',')}]` :
        input.embedding) :
      null
    
    const rows = await sql`
      INSERT INTO articles (
        title, description, content, category, author, date, image, read_time,
        featured, breaking, trending,
        seo_title, meta_description, focus_keyword, canonical_url, og_image, twitter_card,
        no_index, allow_comments, show_in_rss, amp_enabled,
        redirect_url, css_class, visibility, scheduled_at, status,
        source_url,
        embedding,
        user_id
      ) VALUES (
        ${input.title},
        ${input.description},
        ${input.content},
        ${input.category},
        ${input.author},
        ${input.date.toISOString()},
        ${input.image},
        ${input.readTime},
        ${input.featured         ?? false},
        ${input.breaking         ?? false},
        ${input.trending         ?? false},
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
        ${input.status           ?? 'draft'},
        ${input.sourceUrl        ?? null},
         ${embeddingValue},
        'd785d4d5-d04c-4602-853b-63a089a55e76') RETURNING *`
    return rows[0] ? mapRow(rows[0]) : null
  } catch (e) { console.error('createArticle:', e); return null }
}

export async function updateArticle(id: string, input: UpdateArticleInput): Promise < NewsArticle | null > {
  
  const fieldMap: Record < string, string > = {
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
    seoTitle: 'seo_title',
    metaDescription: 'meta_description',
    focusKeyword: 'focus_keyword',
    canonicalUrl: 'canonical_url',
    ogImage: 'og_image',
    twitterCard: 'twitter_card',
    noIndex: 'no_index',
    allowComments: 'allow_comments',
    showInRss: 'show_in_rss',
    ampEnabled: 'amp_enabled',
    redirectUrl: 'redirect_url',
    cssClass: 'css_class',
    visibility: 'visibility',
    scheduledAt: 'scheduled_at',
    status: 'status',
    sourceUrl: 'source_url',
    ptpLinks: 'ptp_links'
    // ✅ NEW
  }
  
  const fields: string[] = []
  const values: unknown[] = []
  
  for (const [key, col] of Object.entries(fieldMap)) {
    if (!(key in input)) continue
    fields.push(col)
    const raw = (input as Record < string, unknown > )[key]
    values.push((key === 'date' || key === 'scheduledAt') && raw instanceof Date ?
      raw.toISOString() :
      raw !== undefined ? raw : null)
  }
  
  if (fields.length === 0) return getArticleById(id)
  
  try {
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
    const query = `UPDATE articles SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`
    const rawSql = neon(process.env.DATABASE_URL!)
    const rows = await rawSql(query, [...values, id])
    return rows[0] ? mapRow(rows[0] as Record < string, unknown > ) : null
  } catch (e) { console.error('updateArticle:', e); return null }
}

export async function deleteArticle(id: string): Promise < boolean > {
  try { const r = await sql`DELETE FROM articles WHERE id = ${id} RETURNING id`; return r.length > 0 }
  catch (e) { console.error('deleteArticle:', e); return false }
}

// ── Vector Search ─────────────────────────────────────────────────────────────

const HF_EMBED_MODEL = process.env.HF_EMBEDDING_MODEL ?? 'models/gemini-embedding-2-preview'

async function embedQuery(query: string): Promise < number[] | null > {
  try {
    const { OpenAI } = await import('openai')
    const hf = new OpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: process.env.HF_API_KEY ?? 'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk',
    })
    const res = await hf.embeddings.create({ model: HF_EMBED_MODEL, input: query })
    const vector = res.data[0]?.embedding
    if (!Array.isArray(vector) || !vector.length) throw new Error('Empty embedding response')
    return vector as number[]
  } catch (e) {
    console.error('embedQuery:', e)
    return null
  }
}

/**
 * Embed a plain-text query, then find the most semantically similar articles.
 */
export async function searchArticlesByQuery(
  query: string,
  limit = 5,
  threshold = 0.5,
  status: ArticleStatus = 'published',
): Promise < NewsArticle[] > {
  const vector = await embedQuery(query)
  if (!vector) {
    console.error('searchArticlesByQuery: embedding failed, falling back to text search')
    return searchArticles(query)
  }
  return searchArticlesByVector(vector, limit, threshold, status)
}

/**
 * Layer 3 — pgvector cosine-distance search.
 * Catches same story written in different words from a different URL.
 *
 * @param queryVector  - Embedding of the candidate article text.
 * @param limit        - Max results (default 5).
 * @param threshold    - Max cosine distance 0–1 (default 0.5). Lower = stricter.
 * @param status       - Article status filter (default 'published').
 */
export async function searchArticlesByVector(
  queryVector: number[],
  limit = 5,
  threshold = 0.5,
  status: ArticleStatus = 'published',
): Promise < NewsArticle[] > {
  try {
    const vectorLiteral = `[${queryVector.join(',')}]`
    const rawSql = neon(process.env.DATABASE_URL!)
    const rows = await rawSql(
        `SELECT *, (embedding <=> $1::vector) AS distance
       FROM   articles
       WHERE  status    = $2
         AND  embedding IS NOT NULL
         AND  (embedding <=> $1::vector) < $3
       ORDER  BY distance ASC
       LIMIT  $4`,
        [vectorLiteral, status, threshold, limit],
      ) as Record < string,
      unknown > []
    
    return filterRows(rows)
  } catch (e) {
    console.error('searchArticlesByVector:', e)
    return []
  }
}

export const categories = ['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health', 'World'] as
const
export type Category = typeof categories[number]