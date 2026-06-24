import { Router } from "express";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

function mapRow(row: Record<string, unknown>) {
  if (!row?.id) return null;
  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    content: row.content ?? '',
    category: row.category ?? '',
    author: row.author ?? '',
    date: row.date,
    image: row.image ?? '',
    readTime: row.read_time ?? 3,
    featured: row.featured ?? false,
    breaking: row.breaking ?? false,
    trending: row.trending ?? false,
    views: row.views ?? 0,
    slug: row.slug ?? '',
    sourceUrl: row.source_url ?? null,
    seoTitle: row.seo_title ?? null,
    metaDescription: row.meta_description ?? null,
    focusKeyword: row.focus_keyword ?? null,
    canonicalUrl: row.canonical_url ?? null,
    ogImage: row.og_image ?? null,
    twitterCard: row.twitter_card ?? 'summary_large_image',
    noIndex: row.no_index ?? false,
    allowComments: row.allow_comments ?? true,
    showInRss: row.show_in_rss ?? true,
    ampEnabled: row.amp_enabled ?? false,
    visibility: row.visibility ?? 'public',
    status: row.status ?? 'draft',
    updatedAt: row.updated_at,
  };
}

router.get("/articles", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '20'), 100);
    const offset = parseInt(req.query.offset as string || '0');
    const category = req.query.category as string | undefined;
    const status = req.query.status as string | undefined;
    const featured = req.query.featured as string | undefined;
    const breaking = req.query.breaking as string | undefined;
    const trending = req.query.trending as string | undefined;

    let query = `SELECT * FROM articles WHERE 1=1`;
    const params: unknown[] = [];
    let idx = 1;

    if (category) { query += ` AND category ILIKE $${idx++}`; params.push(category); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }
    else { query += ` AND status = 'published'`; }
    if (featured === 'true') { query += ` AND featured = TRUE`; }
    if (breaking === 'true') { query += ` AND breaking = TRUE`; }
    if (trending === 'true') { query += ` AND trending = TRUE`; }

    query += ` ORDER BY date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapRow).filter(Boolean));
  } catch (e) {
    req.log.error(e, "GET /articles");
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

router.get("/articles/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json([]);
    
    const like = `%${q}%`;
    const result = await pool.query(
      `SELECT * FROM articles WHERE (title ILIKE $1 OR description ILIKE $1 OR content ILIKE $1) AND status = 'published' ORDER BY date DESC LIMIT 20`,
      [like]
    );
    res.json(result.rows.map(mapRow).filter(Boolean));
  } catch (e) {
    req.log.error(e, "GET /articles/search");
    res.status(500).json({ error: "Search failed" });
  }
});

router.get("/articles/by-slug/:slug", async (req, res) => {
  try {
    
    const result = await pool.query(
      `SELECT * FROM articles WHERE slug = $1 LIMIT 1`,
      [req.params.slug]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    // Increment views async
    pool.query(`UPDATE articles SET views = views + 1 WHERE slug = $1`, [req.params.slug]).catch(() => {});
    res.json(mapRow(result.rows[0]));
  } catch (e) {
    req.log.error(e, "GET /articles/by-slug/:slug");
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

router.get("/articles/:id", async (req, res) => {
  try {
    
    const result = await pool.query(
      `SELECT * FROM articles WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(mapRow(result.rows[0]));
  } catch (e) {
    req.log.error(e, "GET /articles/:id");
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

export default router;
