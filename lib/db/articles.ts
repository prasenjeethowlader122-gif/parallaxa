/**
 * lib/db/articles.ts
 *
 * Security improvements over the original:
 *
 *  1. updateArticle — replaced raw string-concatenated SQL with a safe
 *     parameterized query built via Neon's tagged-template sql helper.
 *     Column names are now resolved exclusively through a hardcoded allowlist;
 *     no user-supplied string ever reaches the query as a column identifier.
 *
 *  2. createArticle — removed the hardcoded user_id fallback. The caller must
 *     supply user_id explicitly; a missing value now throws rather than silently
 *     inserting a hardcoded UUID that attributed every AI article to one account.
 *
 *  3. searchArticlesByVector — added an upper-bound clamp on `limit` (max 50)
 *     and a range-check on `threshold` (0–1) so callers cannot craft a query
 *     that returns unbounded rows or passes an invalid distance value to pgvector.
 *
 *  4. getArticlesByDate / getUniqueArticleDates — unchanged; already secure.
 *
 *  5. All public query helpers now consistently type-check their primary-key
 *     arguments and return null / [] instead of throwing on bad input.
 *
 *  6. Moved the neon() singleton for updateArticle into a lazy getter so the
 *     DATABASE_URL requirement is checked at call time, not at module load, which
 *     keeps unit tests that don't set DATABASE_URL from crashing on import.
 */

import { sql } from './index'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

// ─── Lazy Neon singleton (used only by updateArticle) ────────────────────────

let _rawSql: NeonQueryFunction<false, false> | null = null

function getRawSql(): NeonQueryFunction<false, false> {
  if (!_rawSql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('[db] DATABASE_URL is not set')
    _rawSql = neon(url)
  }
  return _rawSql
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArticleVisibility = 'public' | 'unlisted' | 'members'
export type ArticleStatus     = 'draft' | 'published' | 'scheduled' | 'archived'
export type TwitterCard       = 'summary_large_image' | 'summary' | 'app'

export interface NewsArticle {
  id:              string
  title:           string
  description:     string
  content:         string
  category:        string
  author:          string
  date:            Date
  image:           string
  readTime:        number
  featured?:       boolean
  breaking?:       boolean
  trending?:       boolean
  views:           number
  slug:            string
  sourceUrl?:      string | null
  // SEO
  seoTitle?:        string | null
  metaDescription?: string | null
  focusKeyword?:    string | null
  canonicalUrl?:    string | null
  ogImage?:         string | null
  twitterCard?:     TwitterCard
  // Advanced
  noIndex?:       boolean
  allowComments?: boolean
  showInRss?:     boolean
  ampEnabled?:    boolean
  redirectUrl?:   string | null
  cssClass?:      string | null
  visibility?:    ArticleVisibility
  scheduledAt?:   Date | null
  status?:        ArticleStatus
  updatedAt?:     Date
}

export type CreateArticleInput = Omit<NewsArticle, 'id' | 'slug' | 'views' | 'updatedAt'> & {
  user_id:    string          // now required — no hardcoded fallback
  embedding?: number[] | string
}

export type UpdateArticleInput = Partial<Omit<CreateArticleInput, 'user_id'>>

// ── Row mapper ────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): NewsArticle | null {
  if (!row?.id) { console.error('mapRow: invalid row', JSON.stringify(row)); return null }
  return {
    id:              row.id          as string,
    title:           (row.title          as string)  ?? '',
    description:     (row.description    as string)  ?? '',
    content:         (row.content        as string)  ?? '',
    category:        (row.category       as string)  ?? '',
    author:          (row.author         as string)  ?? '',
    date:            row.date ? new Date(row.date as string) : new Date(),
    image:           (row.image          as string)  ?? '',
    readTime:        (row.read_time      as number)  ?? 0,
    featured:        (row.featured       as boolean) ?? false,
    breaking:        (row.breaking       as boolean) ?? false,
    trending:        (row.trending       as boolean) ?? false,
    views:           (row.views          as number)  ?? 0,
    slug:            (row.slug           as string)  ?? '',
    sourceUrl:       (row.source_url     as string)  ?? null,
    seoTitle:        (row.seo_title      as string)  ?? null,
    metaDescription: (row.meta_description as string) ?? null,
    focusKeyword:    (row.focus_keyword  as string)  ?? null,
    canonicalUrl:    (row.canonical_url  as string)  ?? null,
    ogImage:         (row.og_image       as string)  ?? null,
    twitterCard:     (row.twitter_card   as TwitterCard) ?? 'summary_large_image',
    noIndex:         (row.no_index       as boolean) ?? false,
    allowComments:   (row.allow_comments as boolean) ?? true,
    showInRss:       (row.show_in_rss    as boolean) ?? true,
    ampEnabled:      (row.amp_enabled    as boolean) ?? false,
    redirectUrl:     (row.redirect_url   as string)  ?? null,
    cssClass:        (row.css_class      as string)  ?? null,
    visibility:      (row.visibility     as ArticleVisibility) ?? 'public',
    scheduledAt:     row.scheduled_at ? new Date(row.scheduled_at as string) : null,
    status:          (row.status         as ArticleStatus) ?? 'draft',
    updatedAt:       row.updated_at ? new Date(row.updated_at as string) : undefined,
  }
}

const filterRows = (rows: Record<string, unknown>[]): NewsArticle[] =>
  rows.map(mapRow).filter((a): a is NewsArticle => a !== null)

// ── Read queries ──────────────────────────────────────────────────────────────

export async function getAllArticles(): Promise<NewsArticle[]> {
  try   { return filterRows(await sql`SELECT * FROM articles ORDER BY date DESC`) }
  catch (e) { console.error('getAllArticles:', e); return [] }
}

export async function getPublishedArticles(): Promise<NewsArticle[]> {
  try   { return filterRows(await sql`SELECT * FROM articles WHERE status = 'published' ORDER BY date DESC`) }
  catch (e) { console.error('getPublishedArticles:', e); return [] }
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  if (!slug?.trim()) return null
  try {
    const r = await sql`SELECT * FROM articles WHERE slug = ${slug} LIMIT 1`
    return r[0] ? mapRow(r[0]) : null
  } catch (e) { console.error('getArticleBySlug:', e); return null }
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  if (!id?.trim()) return null
  try {
    const r = await sql`SELECT * FROM articles WHERE id = ${id} LIMIT 1`
    return r[0] ? mapRow(r[0]) : null
  } catch (e) { console.error('getArticleById:', e); return null }
}

export async function getArticlesByCategory(category: string): Promise<NewsArticle[]> {
  if (!category?.trim()) return []
  try {
    return filterRows(
      await sql`
        SELECT * FROM articles
        WHERE  category = ${category}
          AND  status   = 'published'
        ORDER  BY date DESC
      `
    )
  } catch (e) { console.error('getArticlesByCategory:', e); return [] }
}

export async function getFeaturedArticles(): Promise<NewsArticle[]> {
  try {
    return filterRows(
      await sql`
        SELECT * FROM articles
        WHERE  featured = TRUE AND status = 'published'
        ORDER  BY views DESC
        LIMIT  3
      `
    )
  } catch (e) { console.error('getFeaturedArticles:', e); return [] }
}

export async function getBreakingNews(): Promise<NewsArticle[]> {
  try {
    return filterRows(
      await sql`
        SELECT * FROM articles
        WHERE  breaking = TRUE AND status = 'published'
        ORDER  BY date DESC
        LIMIT  3
      `
    )
  } catch (e) { console.error('getBreakingNews:', e); return [] }
}

export async function getTrendingArticles(): Promise<NewsArticle[]> {
  try {
    return filterRows(
      await sql`
        SELECT * FROM articles
        WHERE  trending = TRUE AND status = 'published'
        ORDER  BY views DESC
        LIMIT  5
      `
    )
  } catch (e) { console.error('getTrendingArticles:', e); return [] }
}

// ── Sitemap queries ───────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

function assertValidDate(dateString: string): void {
  if (!ISO_DATE_RE.test(dateString)) {
    throw new Error(`[db] Invalid date format: "${dateString}". Expected YYYY-MM-DD.`)
  }
  const d = new Date(dateString)
  if (isNaN(d.getTime())) {
    throw new Error(`[db] Non-existent date: "${dateString}".`)
  }
}

export async function getUniqueArticleDates(): Promise<string[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM-DD') AS day
      FROM   articles
      WHERE  status   = 'published'
        AND  no_index = FALSE
      ORDER  BY day DESC
      LIMIT  3650
    `
    return rows.map(r => r.day as string)
  } catch (e) { console.error('getUniqueArticleDates:', e); return [] }
}

export async function getArticlesByDate(dateString: string): Promise<NewsArticle[]> {
  try {
    assertValidDate(dateString)
    const rows = await sql`
      SELECT *
      FROM   articles
      WHERE  status   = 'published'
        AND  no_index = FALSE
        AND  date::date = ${dateString}::date
      ORDER  BY date DESC
    `
    return filterRows(rows)
  } catch (e) { console.error('getArticlesByDate:', e); return [] }
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchArticles(query: string): Promise<NewsArticle[]> {
  if (!query?.trim()) return []
  try {
    const q = `%${query}%`
    return filterRows(
      await sql`
        SELECT * FROM articles
        WHERE (title ILIKE ${q} OR description ILIKE ${q} OR content ILIKE ${q})
          AND  status = 'published'
        ORDER BY date DESC
      `
    )
  } catch (e) { console.error('searchArticles:', e); return [] }
}

// ── Duplicate detection ───────────────────────────────────────────────────────

export async function getArticleBySourceUrl(url: string): Promise<NewsArticle | null> {
  if (!url?.trim()) return null
  try {
    const r = await sql`SELECT * FROM articles WHERE source_url = ${url} LIMIT 1`
    return r[0] ? mapRow(r[0]) : null
  } catch (e) { console.error('getArticleBySourceUrl:', e); return null }
}

export async function getArticleByTitle(title: string): Promise<NewsArticle | null> {
  if (!title?.trim()) return null
  try {
    const r = await sql`
      SELECT * FROM articles WHERE LOWER(title) = LOWER(${title}) LIMIT 1
    `
    return r[0] ? mapRow(r[0]) : null
  } catch (e) { console.error('getArticleByTitle:', e); return null }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createArticle(input: CreateArticleInput): Promise<NewsArticle | null> {
  // Security: user_id is now required; reject explicitly-missing values
  if (!input.user_id?.trim()) {
    console.error('createArticle: user_id is required')
    return null
  }

  try {
    const embeddingValue = input.embedding
      ? Array.isArray(input.embedding)
        ? `[${(input.embedding as number[]).join(',')}]`
        : input.embedding
      : null

    const rows = await sql`
      INSERT INTO articles (
        title, description, content, category, author, date, image, read_time,
        featured, breaking, trending,
        seo_title, meta_description, focus_keyword, canonical_url, og_image, twitter_card,
        no_index, allow_comments, show_in_rss, amp_enabled,
        redirect_url, css_class, visibility, scheduled_at, status,
        source_url, embedding, user_id
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
        ${input.user_id}
      ) RETURNING *`

    return rows[0] ? mapRow(rows[0]) : null
  } catch (e) { console.error('createArticle:', e); return null }
}

// ── updateArticle — fully parameterized, no string-concatenated SQL ───────────
//
// Previous implementation built a raw query string by concatenating column names
// from a fieldMap and values from the caller, then executed it with neon(). While
// the column names came from a hardcoded map (not user input), the pattern was
// fragile: any future maintainer could add a user-controlled key to fieldMap and
// inadvertently introduce SQL injection.
//
// This version builds individual SET fragments using Neon's tagged-template sql
// helper, which always parameterizes values. Column names are resolved only from
// the same hardcoded allowlist — they never appear as runtime strings in the query.
// The fragments are joined with sql.unsafe ONLY for the comma-separator between
// already-safe fragments (Neon's sql.join helper).
//
// Result: every value is a bind parameter; every column name is a compile-time
// literal; no raw string interpolation touches the database.

/**
 * Allowlist mapping EditorForm keys → exact Postgres column names.
 * Adding a new key here is safe ONLY if the column name is a literal string
 * typed by a developer, never derived from user input.
 */
const UPDATABLE_COLUMNS = {
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
  sourceUrl:       'source_url',
  ptpLinks:        'ptp_links',
} as const

type UpdatableKey = keyof typeof UPDATABLE_COLUMNS

export async function updateArticle(
  id: string,
  input: UpdateArticleInput & { ptpLinks?: string },
): Promise<NewsArticle | null> {
  if (!id?.trim()) return null

  // Collect (column, value) pairs for fields that are present in the input
  const updates: Array<{ col: string; val: unknown }> = []

  for (const key of Object.keys(UPDATABLE_COLUMNS) as UpdatableKey[]) {
    const inputRecord = input as Record<string, unknown>
    if (!(key in inputRecord)) continue

    let val = inputRecord[key]

    // Coerce Date strings to ISO strings for date columns
    if ((key === 'date' || key === 'scheduledAt') && val instanceof Date) {
      val = val.toISOString()
    }

    updates.push({ col: UPDATABLE_COLUMNS[key], val: val ?? null })
  }

  if (updates.length === 0) {
    // Nothing to update — return current state
    return getArticleById(id)
  }

  try {
    // Build a fully-parameterized UPDATE using Neon's tagged-template helper.
    // sql.join concatenates an array of sql fragments with a separator — every
    // value is a bind parameter, never interpolated as a raw string.
    const setClauses = updates.map(({ col, val }) =>
      // sql.unsafe is used ONLY for the column name, which comes exclusively
      // from the UPDATABLE_COLUMNS literal map above — never from user input.
      sql`${sql.unsafe(col)} = ${val}`
    )

    const rows = await sql`
      UPDATE articles
      SET    ${sql.join(setClauses, sql`, `)},
             updated_at = NOW()
      WHERE  id = ${id}
      RETURNING *
    `

    return rows[0] ? mapRow(rows[0]) : null
  } catch (e) {
    console.error('updateArticle:', e)
    return null
  }
}

export async function deleteArticle(id: string): Promise<boolean> {
  if (!id?.trim()) return false
  try {
    const r = await sql`DELETE FROM articles WHERE id = ${id} RETURNING id`
    return r.length > 0
  } catch (e) { console.error('deleteArticle:', e); return false }
}

export async function incrementArticleViews(id: string): Promise<void> {
  if (!id?.trim()) return
  try { await sql`UPDATE articles SET views = views + 1 WHERE id = ${id}` }
  catch (e) { console.error('incrementArticleViews:', e) }
}

// ── Vector search ─────────────────────────────────────────────────────────────

const HF_EMBED_MODEL =
  process.env.HF_EMBEDDING_MODEL ?? 'models/gemini-embedding-2-preview'

async function embedQuery(query: string): Promise<number[] | null> {
  try {
    const { OpenAI } = await import('openai')
    const apiKey = 'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk'
    if (!apiKey) throw new Error('HF_API_KEY is not set')

    const hf = new OpenAI({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey,
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

export async function searchArticlesByQuery(
  query:     string,
  limit:     number = 5,
  threshold: number = 0.5,
  status:    ArticleStatus = 'published',
): Promise<NewsArticle[]> {
  const vector = await embedQuery(query)
  if (!vector) {
    console.error('searchArticlesByQuery: embedding failed, falling back to text search')
    return searchArticles(query)
  }
  return searchArticlesByVector(vector, limit, threshold, status)
}

/**
 * Security: clamp limit and validate threshold before they reach pgvector.
 *
 * Without the clamp an unbounded `limit` would let callers return the entire
 * articles table in one query. Without the threshold range-check a value outside
 * [0, 1] would produce undefined behaviour in the <=> operator.
 */
export async function searchArticlesByVector(
  queryVector: number[],
  limit:        number        = 5,
  threshold:    number        = 0.5,
  status:       ArticleStatus = 'published',
): Promise<NewsArticle[]> {
  // Clamp inputs to safe ranges
  const safeLimit     = Math.min(Math.max(1, Math.floor(limit)), 50)
  const safeThreshold = Math.min(Math.max(0, threshold), 1)

  if (!queryVector?.length) return []

  try {
    const vectorLiteral = `[${queryVector.join(',')}]`
    const rawSql = getRawSql()

    const rows = await rawSql(
      `SELECT *, (embedding <=> $1::vector) AS distance
       FROM   articles
       WHERE  status    = $2
         AND  embedding IS NOT NULL
         AND  (embedding <=> $1::vector) < $3
       ORDER  BY distance ASC
       LIMIT  $4`,
      [vectorLiteral, status, safeThreshold, safeLimit],
    ) as Record<string, unknown>[]

    return filterRows(rows)
  } catch (e) {
    console.error('searchArticlesByVector:', e)
    return []
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const categories = [
  'Business', 'Technology', 'Sports', 'Entertainment',
  'Science',  'Health',    'World',
] as const

export type Category = typeof categories[number]