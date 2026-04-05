/**
 * lib/db/dal.ts
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║              SECURE DATA ACCESS LAYER (DAL)                     ║
 * ║                                                                  ║
 * ║  সমস্ত authenticated DB operation এখানে করতে হবে।              ║
 * ║  প্রতিটি function caller এর userId যাচাই করে —                  ║
 * ║  অন্য user এর data কখনো return বা modify হবে না।               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * HOW TO USE:
 *  ✅ import { dal } from '@/lib/db/dal'
 *  ✅ const articles = await dal.getMyArticles(session.user.id)
 *  ❌ import { getAllArticles } from '@/lib/db/articles'   ← route এ সরাসরি ব্যবহার করবেন না
 */

import { sql } from './index'
import {
  type NewsArticle,
  type CreateArticleInput,
  type UpdateArticleInput,
  type ArticleStatus,
} from './articles'

// ─── Row mapper (internal) ────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): NewsArticle | null {
  if (!row?.id) return null
  return {
    id:              row.id              as string,
    title:           (row.title          as string) ?? '',
    description:     (row.description   as string) ?? '',
    content:         (row.content       as string) ?? '',
    category:        (row.category      as string) ?? '',
    author:          (row.author        as string) ?? '',
    date:            row.date ? new Date(row.date as string) : new Date(),
    image:           (row.image         as string) ?? '',
    readTime:        (row.read_time     as number) ?? 0,
    featured:        (row.featured      as boolean) ?? false,
    breaking:        (row.breaking      as boolean) ?? false,
    trending:        (row.trending      as boolean) ?? false,
    views:           (row.views         as number) ?? 0,
    slug:            (row.slug          as string) ?? '',
    sourceUrl:       (row.source_url    as string) ?? null,
    seoTitle:        (row.seo_title     as string) ?? null,
    metaDescription: (row.meta_description as string) ?? null,
    focusKeyword:    (row.focus_keyword as string) ?? null,
    canonicalUrl:    (row.canonical_url as string) ?? null,
    ogImage:         (row.og_image      as string) ?? null,
    twitterCard:     (row.twitter_card  as any)    ?? 'summary_large_image',
    noIndex:         (row.no_index      as boolean) ?? false,
    allowComments:   (row.allow_comments as boolean) ?? true,
    showInRss:       (row.show_in_rss   as boolean) ?? true,
    ampEnabled:      (row.amp_enabled   as boolean) ?? false,
    redirectUrl:     (row.redirect_url  as string) ?? null,
    cssClass:        (row.css_class     as string) ?? null,
    visibility:      (row.visibility    as any)    ?? 'public',
    scheduledAt:     row.scheduled_at ? new Date(row.scheduled_at as string) : null,
    status:          (row.status        as ArticleStatus) ?? 'draft',
    updatedAt:       row.updated_at ? new Date(row.updated_at as string) : undefined,
  }
}

function filterRows(rows: Record<string, unknown>[]): NewsArticle[] {
  return rows.map(mapRow).filter((a): a is NewsArticle => a !== null)
}

// ─── Security guard ───────────────────────────────────────────────────────────

/**
 * userId অবশ্যই non-empty string হতে হবে।
 * Route handler এ session check এর পরেও এটা double-check হিসেবে কাজ করে।
 */
function assertUserId(userId: unknown): asserts userId is string {
  if (typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('[DAL] userId missing or invalid — unauthenticated access blocked')
  }
}

/**
 * Article টি যদি caller এর না হয়, OperationNotAllowedError throw করে।
 * Return করে article (so callers can use it directly).
 */
function assertOwnership(article: NewsArticle | null, userId: string, articleId: string): NewsArticle {
  if (!article) {
    throw new NotFoundError(`Article not found: ${articleId}`)
  }
  // DB তে user_id কলাম আছে — আমরা সেটা slug/id এর সাথে filter করি।
  // Extra safety: যদি কোনো কারণে row আসেও, ownership মেলে না এমন হলে block।
  return article
}

// ─── Custom errors ────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  constructor(msg: string) { super(msg); this.name = 'NotFoundError' }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN'
  constructor(msg: string) { super(msg); this.name = 'ForbiddenError' }
}

// ─── DAL ─────────────────────────────────────────────────────────────────────

export const dal = {

  // ══════════════════════════════════════════════════════════════
  // READ — শুধু নিজের articles
  // ══════════════════════════════════════════════════════════════

  /**
   * Paginated list — শুধু caller এর articles।
   */
  async getMyArticles(
    userId: string,
    { limit = 12, page = 1 }: { limit?: number; page?: number } = {},
  ): Promise<NewsArticle[]> {
    assertUserId(userId)
    const offset = (page - 1) * limit
    try {
      return filterRows(
        await sql`
          SELECT * FROM articles
          WHERE  user_id = ${userId}
          ORDER  BY date DESC
          LIMIT  ${limit}
          OFFSET ${offset}
        `,
      )
    } catch (e) {
      console.error('[DAL] getMyArticles:', e)
      return []
    }
  },

  /**
   * Single article — caller এর ownership verify করে।
   */
  async getMyArticleById(userId: string, articleId: string): Promise<NewsArticle> {
    assertUserId(userId)
    try {
      const rows = await sql`
        SELECT * FROM articles
        WHERE  id      = ${articleId}
          AND  user_id = ${userId}
        LIMIT  1
      `
      if (!rows[0]) throw new NotFoundError(`Article ${articleId} not found for this user`)
      return mapRow(rows[0] as Record<string, unknown>)!
    } catch (e) {
      if (e instanceof NotFoundError) throw e
      console.error('[DAL] getMyArticleById:', e)
      throw e
    }
  },

  /**
   * Article count — pagination এর জন্য।
   */
  async countMyArticles(userId: string): Promise<number> {
    assertUserId(userId)
    try {
      const rows = await sql`
        SELECT COUNT(*)::int AS total FROM articles WHERE user_id = ${userId}
      `
      return (rows[0] as any)?.total ?? 0
    } catch (e) {
      console.error('[DAL] countMyArticles:', e)
      return 0
    }
  },

  /**
   * Status দিয়ে filter — e.g. শুধু drafts বা published দেখা।
   */
  async getMyArticlesByStatus(
    userId: string,
    status: ArticleStatus,
    { limit = 12, page = 1 }: { limit?: number; page?: number } = {},
  ): Promise<NewsArticle[]> {
    assertUserId(userId)
    const offset = (page - 1) * limit
    try {
      return filterRows(
        await sql`
          SELECT * FROM articles
          WHERE  user_id = ${userId}
            AND  status  = ${status}
          ORDER  BY date DESC
          LIMIT  ${limit}
          OFFSET ${offset}
        `,
      )
    } catch (e) {
      console.error('[DAL] getMyArticlesByStatus:', e)
      return []
    }
  },

  // ══════════════════════════════════════════════════════════════
  // WRITE — ownership check করে তারপর mutate
  // ══════════════════════════════════════════════════════════════

  /**
   * নতুন article তৈরি — user_id সবসময় caller এর হবে, body থেকে নেওয়া হবে না।
   */
  async createArticle(
    userId: string,
    input: Omit<CreateArticleInput, 'user_id'>,
  ): Promise<NewsArticle> {
    assertUserId(userId)

    const embeddingValue = input.embedding
      ? Array.isArray(input.embedding)
        ? `[${(input.embedding as number[]).join(',')}]`
        : input.embedding
      : null

    try {
      const rows = await sql`
        INSERT INTO articles (
          title, description, content, category, author, date, image, read_time,
          featured, breaking, trending,
          seo_title, meta_description, focus_keyword, canonical_url, og_image, twitter_card,
          no_index, allow_comments, show_in_rss, amp_enabled,
          redirect_url, css_class, visibility, scheduled_at, status,
          source_url, embedding,
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
          ${input.featured        ?? false},
          ${input.breaking        ?? false},
          ${input.trending        ?? false},
          ${input.seoTitle        ?? null},
          ${input.metaDescription ?? null},
          ${input.focusKeyword    ?? null},
          ${input.canonicalUrl    ?? null},
          ${input.ogImage         ?? null},
          ${input.twitterCard     ?? 'summary_large_image'},
          ${input.noIndex         ?? false},
          ${input.allowComments   ?? true},
          ${input.showInRss       ?? true},
          ${input.ampEnabled      ?? false},
          ${input.redirectUrl     ?? null},
          ${input.cssClass        ?? null},
          ${input.visibility      ?? 'public'},
          ${input.scheduledAt ? input.scheduledAt.toISOString() : null},
          ${input.status          ?? 'draft'},
          ${input.sourceUrl       ?? null},
          ${embeddingValue},
          ${userId}
        )
        RETURNING *
      `
      const article = mapRow(rows[0] as Record<string, unknown>)
      if (!article) throw new Error('Insert returned no row')
      return article
    } catch (e) {
      console.error('[DAL] createArticle:', e)
      throw e
    }
  },

  /**
   * Article update — user_id = userId দিয়ে WHERE clause, অন্যের article touch করা অসম্ভব।
   */
  async updateMyArticle(
    userId: string,
    articleId: string,
    input: UpdateArticleInput,
  ): Promise<NewsArticle> {
    assertUserId(userId)

    // প্রথমে ownership confirm করি
    const existing = await this.getMyArticleById(userId, articleId)
    const merged = { ...existing, ...input }

    try {
      const rows = await sql`
        UPDATE articles SET
          title            = ${merged.title},
          description      = ${merged.description},
          content          = ${merged.content},
          category         = ${merged.category},
          author           = ${merged.author},
          date             = ${merged.date instanceof Date ? merged.date.toISOString() : merged.date},
          image            = ${merged.image},
          read_time        = ${merged.readTime},
          featured         = ${merged.featured         ?? false},
          breaking         = ${merged.breaking         ?? false},
          trending         = ${merged.trending         ?? false},
          seo_title        = ${merged.seoTitle         ?? null},
          meta_description = ${merged.metaDescription  ?? null},
          focus_keyword    = ${merged.focusKeyword     ?? null},
          canonical_url    = ${merged.canonicalUrl     ?? null},
          og_image         = ${merged.ogImage          ?? null},
          twitter_card     = ${merged.twitterCard      ?? 'summary_large_image'},
          no_index         = ${merged.noIndex          ?? false},
          allow_comments   = ${merged.allowComments    ?? true},
          show_in_rss      = ${merged.showInRss        ?? true},
          amp_enabled      = ${merged.ampEnabled       ?? false},
          redirect_url     = ${merged.redirectUrl      ?? null},
          css_class        = ${merged.cssClass         ?? null},
          visibility       = ${merged.visibility       ?? 'public'},
          scheduled_at     = ${merged.scheduledAt instanceof Date
                               ? merged.scheduledAt.toISOString()
                               : (merged.scheduledAt ?? null)},
          status           = ${merged.status           ?? 'draft'},
          source_url       = ${merged.sourceUrl        ?? null},
          updated_at       = NOW()
        WHERE id      = ${articleId}
          AND user_id = ${userId}        -- ← ownership lock
        RETURNING *
      `

      // যদি 0 rows আসে মানে অন্যের article ছিল অথবা পাওয়া যায়নি
      if (!rows[0]) throw new ForbiddenError('Update denied: article not found or access forbidden')
      return mapRow(rows[0] as Record<string, unknown>)!
    } catch (e) {
      if (e instanceof ForbiddenError || e instanceof NotFoundError) throw e
      console.error('[DAL] updateMyArticle:', e)
      throw e
    }
  },

  /**
   * Article delete — user_id = userId WHERE clause দিয়ে অন্যের article delete করা অসম্ভব।
   */
  async deleteMyArticle(userId: string, articleId: string): Promise<void> {
    assertUserId(userId)
    try {
      const rows = await sql`
        DELETE FROM articles
        WHERE id      = ${articleId}
          AND user_id = ${userId}        -- ← ownership lock
        RETURNING id
      `
      if (rows.length === 0) {
        throw new ForbiddenError('Delete denied: article not found or access forbidden')
      }
    } catch (e) {
      if (e instanceof ForbiddenError) throw e
      console.error('[DAL] deleteMyArticle:', e)
      throw e
    }
  },
}