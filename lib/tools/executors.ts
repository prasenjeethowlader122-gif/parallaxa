/**
 * lib/tools/executors.ts
 *
 * Tool implementations — all DB access goes directly through DB functions,
 * no internal HTTP API calls.
 */

import {
  getAllArticles,
  getArticleById,
  searchArticlesByQuery,
  searchArticles,
  getArticlesByCategory,
  createArticle,
  updateArticle,
  deleteArticle,
} from '@/lib/db/articles'
import { inngest } from '@/lib/inngest/client'

// ─── Shared helpers ───────────────────────────────────────────────────────────

function truncate(text: string, max = 3000): string {
  return text.length > max ? text.slice(0, max) + '\n…(truncated)' : text
}

// ─── Tool implementations ─────────────────────────────────────────────────────

/**
 * Search articles by free-text + optional category.
 */
export async function toolSearchArticles(
  query: string,
  category?: string,
  limitStr?: string
): Promise<string> {
  try {
    const limit = parseInt(limitStr ?? '5', 10) || 5

    // Use vector/semantic search if possible, fall back to text search
    let articles = await searchArticlesByQuery(query, limit * 2)

    // Optional category filter
    if (category) {
      articles = articles.filter(
        (a) => a.category?.toLowerCase() === category.toLowerCase()
      )
    }

    if (articles.length === 0) {
      // Fallback to simple text search
      const fallback = await searchArticles(query)
      articles = category
        ? fallback.filter((a) => a.category?.toLowerCase() === category.toLowerCase())
        : fallback
    }

    if (articles.length === 0) return `No articles found matching "${query}".`

    const list = articles
      .slice(0, limit)
      .map(
        (a, i) =>
          `[${i + 1}] **${a.title}** (ID: ${a.id})\n` +
          `Category: ${a.category} | Status: ${a.status} | Date: ${
            a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date ?? '').slice(0, 10)
          }\n` +
          `${a.description ?? ''}`
      )
      .join('\n\n')

    return `Found ${Math.min(articles.length, limit)} article(s) for "${query}":\n\n${list}`
  } catch (e) {
    return `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Fetch a single article by ID and return a readable summary.
 */
export async function toolGetArticle(id: string): Promise<string> {
  try {
    const a = await getArticleById(id)
    if (!a) return `Article with ID "${id}" was not found.`

    const date =
      a.date instanceof Date
        ? a.date.toISOString().slice(0, 10)
        : String(a.date ?? '').slice(0, 10)

    return (
      `**${a.title}**\n` +
      `ID: ${a.id} | Category: ${a.category} | Status: ${a.status}\n` +
      `Author: ${a.author} | Date: ${date}\n\n` +
      `**Description:** ${a.description}\n\n` +
      truncate(a.content ?? '', 2000)
    )
  } catch (e) {
    return `Failed to fetch article: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Generate a new article with AI (Cloudflare) and save it as a draft directly to DB.
 */
export async function toolGenerateArticle(
  topic: string,
  category: string,
  tone: string = 'neutral',
  length: string = 'medium'
): Promise<string> {
  try {
    const wordTarget = length === 'short' ? 300 : length === 'long' ? 1200 : 600

    const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? '342bdd8fddcbe228eb8c1d289d73da5a'
    const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_AI_TOKEN ?? ''
    const MODEL = process.env.CLOUDFLARE_AI_MODEL ?? '@cf/moonshotai/kimi-k2.5'

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`

    const prompt = `Write a ${tone} news article about: "${topic}".
Category: ${category}. Target length: ~${wordTarget} words.

Respond ONLY with a valid JSON object in this exact shape (no markdown, no backticks):
{
  "title": "...",
  "description": "One-sentence summary (max 160 chars)",
  "content": "Full article body in Markdown paragraphs",
  "seoTitle": "SEO-optimised title (max 60 chars)",
  "metaDescription": "Meta description (max 160 chars)",
  "focusKeyword": "primary keyword"
}`

    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!cfRes.ok) return `AI generation failed: ${cfRes.statusText}`

    const cfData = await cfRes.json()
    const rawText: string =
      cfData.result?.response ??
      cfData.choices?.[0]?.message?.content ??
      cfData.result?.choices?.[0]?.message?.content ??
      ''

    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    let generated: Record<string, unknown>
    try {
      generated = JSON.parse(jsonText)
    } catch {
      return `AI generated content but could not parse JSON:\n\n${truncate(rawText, 1000)}`
    }

    // Save directly to DB
    const saved = await createArticle({
      title: String(generated.title ?? topic),
      description: String(generated.description ?? ''),
      content: String(generated.content ?? ''),
      category,
      author: 'Parallaxa AI',
      date: new Date(),
      image: '',
      readTime: Math.round(wordTarget / 200),
      featured: false,
      breaking: false,
      trending: false,
      seoTitle: generated.seoTitle ? String(generated.seoTitle) : null,
      metaDescription: generated.metaDescription ? String(generated.metaDescription) : null,
      focusKeyword: generated.focusKeyword ? String(generated.focusKeyword) : null,
      twitterCard: 'summary_large_image',
      visibility: 'public',
      status: 'draft',
      noIndex: false,
      allowComments: true,
      showInRss: true,
      ampEnabled: false,
    })

    if (!saved) {
      return (
        `Article generated but could not be saved to DB.\n\n` +
        `**Title:** ${generated.title}\n\n${truncate(String(generated.content ?? ''), 500)}`
      )
    }

    return (
      `✅ Article generated and saved as draft!\n\n` +
      `**Title:** ${saved.title}\n` +
      `**ID:** ${saved.id}\n` +
      `**Category:** ${saved.category}\n` +
      `**Read time:** ~${saved.readTime} min\n\n` +
      `Preview: ${saved.description}`
    )
  } catch (e) {
    return `Article generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Trigger PTP (Post-to-Platform) for an article via Inngest event.
 */
export async function toolTriggerPtp(articleId: string): Promise<string> {
  try {
    // Verify article exists first
    const article = await getArticleById(articleId)
    if (!article) return `Article "${articleId}" not found. Cannot trigger PTP.`

    const result = await inngest.send({
      name: 'news/ptp.requested',
      data: { articleId, userId: 'ai-agent' },
    })

    const eventId = result?.ids?.[0] ?? result?.id ?? null
    if (!eventId) return `PTP event sent but no event ID returned — check INNGEST_EVENT_KEY.`

    return (
      `✅ PTP job started for "${article.title}"!\n` +
      `**Event ID:** \`${eventId}\`\n\n` +
      `The article is being rendered and will be posted to social media. ` +
      `Use \`check_job_status\` with event ID \`${eventId}\` to monitor progress.`
    )
  } catch (e) {
    return `PTP trigger failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Check the status of an Inngest pipeline job via the Inngest REST API.
 */
export async function toolCheckJobStatus(eventId: string): Promise<string> {
  try {
    const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY
    if (!INNGEST_SIGNING_KEY) return 'INNGEST_SIGNING_KEY is not configured — cannot check job status.'

    // Resolve event → runs
    const runsRes = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
      headers: { Authorization: `Bearer ${INNGEST_SIGNING_KEY}` },
      cache: 'no-store',
    })

    if (!runsRes.ok) return `Could not fetch job status: HTTP ${runsRes.status}`

    const runsJson = await runsRes.json()
    const runs: any[] = runsJson.data ?? []

    if (runs.length === 0) {
      return `Job \`${eventId}\` is queued — run not yet assigned. Try again shortly.`
    }

    const run = runs[0]
    const runId = run.run_id

    // Fetch full run details
    const runRes = await fetch(`https://api.inngest.com/v1/runs/${runId}`, {
      headers: { Authorization: `Bearer ${INNGEST_SIGNING_KEY}` },
      cache: 'no-store',
    })

    let jobDetail: any = run
    if (runRes.ok) {
      const runJson = await runRes.json()
      jobDetail = runJson.data ?? runJson
    }

    const status = (jobDetail.status ?? 'unknown').toUpperCase()
    const started = jobDetail.started_at ?? 'N/A'
    const ended = jobDetail.ended_at ?? 'N/A'
    const error = jobDetail.error?.message ?? null

    return (
      `**Job Status:** ${status}\n` +
      `**Run ID:** ${runId}\n` +
      `**Started:** ${started}\n` +
      `**Completed:** ${ended}` +
      (error ? `\n**Error:** ${error}` : '')
    )
  } catch (e) {
    return `Status check failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Trigger the automated news pipeline via Inngest event.
 */
export async function toolRunNewsPipeline(confirm: string): Promise<string> {
  if (confirm.toLowerCase() !== 'yes') {
    return 'Pipeline not started — confirmation was not "yes". Please confirm to proceed.'
  }

  try {
    const result = await inngest.send({
      name: 'news/pipeline.requested',
      data: {},
    })

    const eventId = result?.ids?.[0] ?? result?.id ?? null
    if (!eventId) return `Pipeline event sent but no event ID returned — check INNGEST_EVENT_KEY.`

    return (
      `✅ News pipeline started!\n` +
      `**Event ID:** \`${eventId}\`\n\n` +
      `The pipeline is scraping sources and generating articles. ` +
      `Use \`check_job_status\` with event ID \`${eventId}\` to monitor progress.`
    )
  } catch (e) {
    return `Pipeline trigger failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * List all articles (optionally filtered by status).
 */
export async function toolListMyArticles(status: string = 'all'): Promise<string> {
  try {
    const all = await getAllArticles()

    const articles =
      status === 'all' ? all : all.filter((a) => a.status === status)

    if (articles.length === 0) {
      return status === 'all'
        ? 'No articles found.'
        : `No articles with status "${status}".`
    }

    const list = articles
      .slice(0, 20)
      .map((a, i) => {
        const date =
          a.date instanceof Date
            ? a.date.toISOString().slice(0, 10)
            : String(a.date ?? '').slice(0, 10)
        return (
          `[${i + 1}] **${a.title}** (ID: ${a.id})\n` +
          `   Status: ${a.status} | Category: ${a.category} | Date: ${date}`
        )
      })
      .join('\n\n')

    return `Articles (${articles.length} total):\n\n${list}`
  } catch (e) {
    return `Failed to list articles: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Update an article's fields directly via DB.
 */
export async function toolUpdateArticle(id: string, fieldsJson: string): Promise<string> {
  try {
    let fields: Record<string, unknown>
    try {
      fields = JSON.parse(fieldsJson)
    } catch {
      return `Invalid fields JSON: ${fieldsJson}`
    }

    // Verify article exists
    const existing = await getArticleById(id)
    if (!existing) return `Article "${id}" not found.`

    // Convert date strings to Date objects if needed
    if (fields.date && typeof fields.date === 'string') {
      fields.date = new Date(fields.date)
    }
    if (fields.scheduledAt && typeof fields.scheduledAt === 'string') {
      fields.scheduledAt = new Date(fields.scheduledAt)
    }

    const updated = await updateArticle(id, fields)
    if (!updated) return `Update failed — no rows returned.`

    const changedKeys = Object.keys(fields).join(', ')
    return (
      `✅ Article updated successfully!\n` +
      `**ID:** ${updated.id}\n` +
      `**Title:** ${updated.title}\n` +
      `**Changed fields:** ${changedKeys}`
    )
  } catch (e) {
    return `Update failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  switch (name) {
    case 'search_articles':
      return toolSearchArticles(args.query, args.category, args.limit)
    case 'get_article':
      return toolGetArticle(args.id)
    case 'generate_article':
      return toolGenerateArticle(args.topic, args.category, args.tone, args.length)
    case 'trigger_ptp':
      return toolTriggerPtp(args.articleId)
    case 'check_job_status':
      return toolCheckJobStatus(args.eventId)
    case 'run_news_pipeline':
      return toolRunNewsPipeline(args.confirm)
    case 'list_my_articles':
      return toolListMyArticles(args.status)
    case 'update_article':
      return toolUpdateArticle(args.id, args.fields)
    default:
      return `Unknown tool: "${name}". Available: search_articles, get_article, generate_article, trigger_ptp, check_job_status, run_news_pipeline, list_my_articles, update_article`
  }
}