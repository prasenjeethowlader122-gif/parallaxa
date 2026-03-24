

import {
  categories,
  getAllArticles,
  getPublishedArticles,
  getArticleById,
  getArticleBySlug,
  getArticlesByCategory,
  getFeaturedArticles,
  searchArticlesByQuery,
  getBreakingNews,
  getTrendingArticles,
  searchArticles,
  incrementArticleViews,
  createArticle,
  updateArticle,
  deleteArticle,
} from '@/lib/db/articles'
 /**
 * app/api/ai/tools/executors.ts
 *
 * Actual implementation of every AI tool.
 * Each function returns a plain string that gets injected back into the
 * LLM conversation as a tool-result message.
 *
 * Internal API calls use the BASE_URL env var (set to your deployment URL
 * or http://localhost:3000 in dev).  A server-side session cookie is NOT
 * available here, so privileged actions (create / update / pipeline) pass
 * an internal service token via the X-Service-Token header — make sure
 * INTERNAL_SERVICE_TOKEN is set in your .env.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || ''

// ─── Shared helpers ───────────────────────────────────────────────────────────

function serviceHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(SERVICE_TOKEN ? { 'X-Service-Token': SERVICE_TOKEN } : {}),
  }
}

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
    const res = await searchArticlesByQuery(
      query
    )

    const articles: any[] = res;
    let filtered = articles;
    const q = query.toLowerCase()

    /*let filtered = articles.filter((a) => {
      const matchText =
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q)
      const matchCat = category
        ? a.category?.toLowerCase() === category.toLowerCase()
        : true
      return matchText && matchCat
    })

    if (filtered.length === 0) return `No articles found matching "${query}".`
    */
    filtered = filtered.slice(0, limit)
    
    const list = filtered
      .map(
        (a, i) =>
          `[${i + 1}] **${a.title}** (ID: ${a.id})\n` +
          `Category: ${a.category} | Status: ${a.status} | Date: ${a.date?.slice(0, 10)}\n` +
          `${a.description ?? ''}`
      )
      .join('\n\n')

    return `Found ${filtered.length} article(s) for "${query}":\n\n${list}`
  } catch (e) {
    return `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Fetch a single article by ID and return a readable summary.
 */
export async function toolGetArticle(id: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/api/articles/${id}`, {
      headers: serviceHeaders(),
      cache: 'no-store',
    })
    if (res.status === 404) return `Article with ID "${id}" was not found.`
    if (!res.ok) return `Failed to fetch article: ${res.statusText}`

    const a = await res.json()
    return (
      `**${a.title}**\n` +
      `ID: ${a.id} | Category: ${a.category} | Status: ${a.status}\n` +
      `Author: ${a.author} | Date: ${a.date?.slice(0, 10)}\n\n` +
      `**Description:** ${a.description}\n\n` +
      truncate(a.content ?? '', 2000)
    )
  } catch (e) {
    return `Failed to fetch article: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Generate a new article with AI and save it as a draft via the articles API.
 */
export async function toolGenerateArticle(
  topic: string,
  category: string,
  tone: string = 'neutral',
  length: string = 'medium'
): Promise<string> {
  try {
    const wordTarget = length === 'short' ? 300 : length === 'long' ? 1200 : 600

    // Call the Cloudflare AI model directly to generate content
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${
      process.env.CLOUDFLARE_ACCOUNT_ID
    }/ai/run/${process.env.CLOUDFLARE_AI_MODEL ?? '@cf/moonshotai/kimi-k2.5'}`

    const prompt = `Write a ${tone} news article about: "${topic}".
Category: ${category}. Target length: ~${wordTarget} words.

Respond ONLY with a valid JSON object in this exact shape (no markdown, no backticks):
{
  "title": "...",
  "description": "One-sentence summary (max 160 chars)",
  "content": "Full article body in HTML paragraphs (<p> tags)",
  "seoTitle": "SEO-optimised title (max 60 chars)",
  "metaDescription": "Meta description (max 160 chars)",
  "focusKeyword": "primary keyword"
}`

    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
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

    // Strip potential markdown fences
    const jsonText = rawText.replace(/```json|```/g, '').trim()
    let generated: any
    try {
      generated = JSON.parse(jsonText)
    } catch {
      // Fallback: return raw text without saving
      return `AI generated the following content (could not save — JSON parse error):\n\n${truncate(rawText, 1000)}`
    }

    // Save as draft via the articles API
    const saveRes = await fetch(`${BASE_URL}/api/articles`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify({
        title: generated.title ?? topic,
        description: generated.description ?? '',
        content: generated.content ?? '',
        category,
        date: new Date().toISOString(),
        status: 'draft',
        seoTitle: generated.seoTitle ?? null,
        metaDescription: generated.metaDescription ?? null,
        focusKeyword: generated.focusKeyword ?? null,
        readTime: Math.round(wordTarget / 200),
      }),
    })

    if (!saveRes.ok) {
      return (
        `Article generated but could not be saved (${saveRes.statusText}).\n\n` +
        `**Title:** ${generated.title}\n\n${truncate(generated.content ?? '', 500)}`
      )
    }

    const saved = await saveRes.json()
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
 * Trigger PTP (Post-to-Platform) for an article.
 */
export async function toolTriggerPtp(articleId: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/api/ptp`, {
      method: 'POST',
      body: JSON.stringify({ articleId }),
    })

    if (res.status === 401) return 'Unauthorized — PTP requires an authenticated session.'
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `PTP trigger failed: ${err.error ?? res.statusText}`
    }

    const { eventId } = await res.json()
    return (
      `✅ PTP job started!\n` +
      `**Event ID:** \`${eventId}\`\n\n` +
      `The article is being rendered and will be posted to social media. ` +
      `You can check the status with \`check_job_status\` and event ID \`${eventId}\`.`
    )
  } catch (e) {
    return `PTP trigger failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Check the status of an Inngest pipeline job.
 */
export async function toolCheckJobStatus(eventId: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/api/pipeline/${eventId}`, {
      headers: serviceHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) return `Could not fetch job status: ${res.statusText}`

    const job = await res.json()

    const progress =
      job.progress?.total > 0
        ? `${job.progress.done}/${job.progress.total} done, ${job.progress.failed} failed`
        : 'No article progress yet'

    const articleLines =
      job.articles?.length > 0
        ? '\n\n**Articles:**\n' +
          job.articles
            .slice(0, 10)
            .map(
              (a: any) =>
                `- [${a.status.toUpperCase()}] ${a.title ?? a.sourceUrl}${
                  a.articleId ? ` (ID: ${a.articleId})` : ''
                }`
            )
            .join('\n')
        : ''

    return (
      `**Job Status:** ${job.status?.toUpperCase()}\n` +
      `**Run ID:** ${job.runId ?? 'pending'}\n` +
      `**Progress:** ${progress}\n` +
      `**Started:** ${job.startedAt ?? 'N/A'}\n` +
      `**Completed:** ${job.completedAt ?? 'N/A'}` +
      (job.error ? `\n**Error:** ${job.error}` : '') +
      articleLines
    )
  } catch (e) {
    return `Status check failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Trigger the automated news pipeline.
 */
export async function toolRunNewsPipeline(confirm: string): Promise<string> {
  if (confirm.toLowerCase() !== 'yes') {
    return 'Pipeline not started — confirmation was not "yes". Please confirm to proceed.'
  }

  try {
    const res = await fetch(`${BASE_URL}/api/pipeline`, {
      method: 'POST',
      headers: serviceHeaders(),
    })

    if (res.status === 401) return 'Unauthorized — pipeline requires an authenticated session.'
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return `Pipeline trigger failed: ${err.error ?? res.statusText}`
    }

    const { eventId } = await res.json()
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
 * List articles belonging to the current user.
 */
export async function toolListMyArticles(status: string = 'all'): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/api/articles/mine`, {
      headers: serviceHeaders(),
      cache: 'no-store',
    })

    if (res.status === 401) return 'Unauthorized — please log in to view your articles.'
    if (!res.ok) return `Failed to fetch your articles: ${res.statusText}`

    let articles: any[] = await res.json()

    if (status !== 'all') {
      articles = articles.filter((a) => a.status === status)
    }

    if (articles.length === 0) {
      return status === 'all'
        ? 'You have no articles yet.'
        : `You have no ${status} articles.`
    }

    const list = articles
      .slice(0, 20)
      .map(
        (a, i) =>
          `[${i + 1}] **${a.title}** (ID: ${a.id})\n` +
          `   Status: ${a.status} | Category: ${a.category} | Date: ${a.date?.slice(0, 10)}`
      )
      .join('\n\n')

    return `Your articles (${articles.length} total):\n\n${list}`
  } catch (e) {
    return `Failed to list articles: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

/**
 * Update an article's fields.
 */
export async function toolUpdateArticle(id: string, fieldsJson: string): Promise<string> {
  try {
    let fields: Record<string, any>
    try {
      fields = JSON.parse(fieldsJson)
    } catch {
      return `Invalid fields JSON: ${fieldsJson}`
    }

    const res = await fetch(`${BASE_URL}/api/articles/${id}`, {
      method: 'PATCH',
      headers: serviceHeaders(),
      body: JSON.stringify(fields),
    })

    if (res.status === 401) return 'Unauthorized — please log in to update articles.'
    if (res.status === 404) return `Article "${id}" not found.`
    if (!res.ok) return `Update failed: ${res.statusText}`

    const updated = await res.json()
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
      return `Unknown tool: "${name}". Available tools: search_articles, get_article, generate_article, trigger_ptp, check_job_status, run_news_pipeline, list_my_articles, update_article`
  }
}