import { getToolMeta, TOOL_MAP } from './definitions'

// ─── In-memory LRU cache (simple) ─────────────────────────────────────────────

interface CacheEntry {
  value: unknown
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function cacheGet(key: string): unknown | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }
  return entry.value
}

function cacheSet(key: string, value: unknown) {
  // Evict oldest if too large
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ─── Timeout wrapper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tool timed out after ${ms}ms`)), ms),
    ),
  ])
}

// ─── Retry wrapper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  toolName: string,
): Promise<T> {
  let lastError: Error = new Error('Unknown error')
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e as Error
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
        console.warn(`[tools] Retrying ${toolName} (attempt ${attempt + 1}/${retries})`)
      }
    }
  }
  throw lastError
}

// ─── DB imports (lazy to avoid cold-start cost) ────────────────────────────────

async function db() {
  return await import('@/lib/db/articles')
}

// ─── RAG context formatter ─────────────────────────────────────────────────────

function formatArticleAsContext(article: any, index: number): string {
  const date = article.date ? new Date(article.date).toLocaleDateString() : 'Unknown date'
  const excerpt = article.content
    ? article.content.replace(/<[^>]+>/g, '').slice(0, 800)
    : article.description || ''

  return [
    `[Source ${index + 1}]`,
    `Title: ${article.title}`,
    `Category: ${article.category} | Date: ${date} | Slug: ${article.slug}`,
    `Summary: ${article.description || ''}`,
    `Excerpt: ${excerpt}`,
    '---',
  ].join('\n')
}

function formatArticleList(articles: any[]): string {
  if (!articles.length) return 'No articles found.'
  return articles
    .map((a, i) => {
      const date = a.date ? new Date(a.date).toLocaleDateString() : ''
      return `${i + 1}. **${a.title}** (${a.category}, ${date})\n   ${a.description || ''}\n   Slug: \`${a.slug}\``
    })
    .join('\n\n')
}

// ─── Individual executors ──────────────────────────────────────────────────────

const executors: Record<string, (args: any) => Promise<unknown>> = {

  async semantic_search({ query, limit = 5, threshold = 0.5, category }: any) {
    const { searchArticlesByQuery, getArticlesByCategory } = await db()

    let articles = await searchArticlesByQuery(query, limit + 3, threshold)

    // Optional category filter
    if (category) {
      articles = articles.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase(),
      )
    }

    articles = articles.slice(0, limit)

    if (!articles.length) {
      return `No semantically similar articles found for: "${query}"`
    }

    const contextBlocks = articles.map(formatArticleAsContext)
    return (
      `Found ${articles.length} relevant article(s) for: "${query}"\n\n` +
      contextBlocks.join('\n')
    )
  },

  async search_articles({ query, limit = 10 }: any) {
    const { searchArticles } = await db()
    const articles = (await searchArticles(query)).slice(0, limit)
    if (!articles.length) return `No articles found for keyword: "${query}"`
    return `**Search results for "${query}":**\n\n` + formatArticleList(articles)
  },

  async get_articles_by_category({ category, limit = 5 }: any) {
    const { getArticlesByCategory } = await db()
    const articles = (await getArticlesByCategory(category)).slice(0, limit)
    if (!articles.length) return `No published articles in category: ${category}`
    return `**Latest ${category} articles:**\n\n` + formatArticleList(articles)
  },

  async get_breaking_news(_args: any) {
    const { getBreakingNews } = await db()
    const articles = await getBreakingNews()
    if (!articles.length) return 'No breaking news at this time.'
    return `**🚨 Breaking News:**\n\n` + formatArticleList(articles)
  },

  async get_featured_articles(_args: any) {
    const { getFeaturedArticles } = await db()
    const articles = await getFeaturedArticles()
    if (!articles.length) return 'No featured articles.'
    return `**⭐ Featured Articles:**\n\n` + formatArticleList(articles)
  },

  async get_trending_articles(_args: any) {
    const { getTrendingArticles } = await db()
    const articles = await getTrendingArticles()
    if (!articles.length) return 'No trending articles.'
    return `**📈 Trending Articles:**\n\n` + formatArticleList(articles)
  },

  async get_article_by_slug({ slug }: any) {
    const { getArticleBySlug } = await db()
    const article = await getArticleBySlug(slug)
    if (!article) return `Article not found: ${slug}`

    const date = new Date(article.date).toLocaleDateString()
    const content = article.content
      ? article.content.replace(/<[^>]+>/g, '').slice(0, 2000)
      : article.description

    return [
      `**${article.title}**`,
      `Category: ${article.category} | Author: ${article.author} | Date: ${date}`,
      `Views: ${article.views} | Read time: ${article.readTime} min`,
      '',
      article.description,
      '',
      '**Content:**',
      content,
    ].join('\n')
  },

  async get_context_for_question({ question, max_chunks = 4 }: any) {
    const { searchArticlesByQuery } = await db()

    // Use a tighter threshold for factual grounding
    const articles = await searchArticlesByQuery(question, max_chunks, 0.45)

    if (!articles.length) {
      return (
        `No relevant context found for: "${question}"\n` +
        'Answer based on general knowledge and mention no specific articles were found.'
      )
    }

    const contextBlocks = articles.map(formatArticleAsContext)

    return [
      `Retrieved ${articles.length} context chunk(s) for: "${question}"`,
      '',
      'Use the following sources to ground your answer. Cite article titles when referencing them.',
      '',
      ...contextBlocks,
      '',
      'Now answer the question using ONLY the above context where possible.',
    ].join('\n')
  },

  async summarize_article({ slug, length = 'medium' }: any) {
    const { getArticleBySlug } = await db()
    const article = await getArticleBySlug(slug)
    if (!article) return `Article not found: ${slug}`

    const charLimit = length === 'short' ? 400 : length === 'long' ? 1500 : 800
    const content = article.content
      ? article.content.replace(/<[^>]+>/g, '').slice(0, charLimit)
      : article.description

    return [
      `Article: **${article.title}**`,
      `Published: ${new Date(article.date).toLocaleDateString()} | Category: ${article.category}`,
      '',
      'Key points from the article:',
      content,
      '',
      `(Slug: \`${article.slug}\`)`,
    ].join('\n')
  },

  async get_articles_by_date({ date }: any) {
    const { getArticlesByDate } = await db()
    const articles = await getArticlesByDate(date)
    if (!articles.length) return `No articles published on ${date}`
    return `**Articles from ${date}:**\n\n` + formatArticleList(articles)
  },
}

// ─── Main executor (with cache + retry + timeout) ─────────────────────────────

export async function executeTool(name: string, rawArgs: unknown): Promise<unknown> {
  const meta = TOOL_MAP.get(name)
  if (!meta) throw new Error(`Unknown tool: "${name}"`)

  // Validate args
  const parsed = meta.schema.safeParse(rawArgs)
  if (!parsed.success) {
    throw new Error(
      `Invalid args for tool "${name}": ${parsed.error.issues.map((i) => i.message).join(', ')}`,
    )
  }
  const args = parsed.data

  // Cache key
  const cacheKey = meta.cacheable ? `${name}:${JSON.stringify(args)}` : null
  if (cacheKey) {
    const cached = cacheGet(cacheKey)
    if (cached !== null) {
      console.log(`[tools] Cache hit: ${name}`)
      return cached
    }
  }

  const executor = executors[name]
  if (!executor) throw new Error(`No executor registered for tool: "${name}"`)

  const timeout = meta.timeout ?? 10000
  const retries = meta.retries ?? 1

  const result = await withRetry(
    () => withTimeout(executor(args), timeout),
    retries,
    name,
  )

  if (cacheKey) cacheSet(cacheKey, result)
  return result
}

// ─── Parallel tool execution ───────────────────────────────────────────────────

export interface ParallelToolResult {
  id: string
  name: string
  result?: unknown
  error?: string
}

export async function executeToolsInParallel(
  calls: Array<{ id: string; name: string; args: unknown }>,
): Promise<ParallelToolResult[]> {
  return Promise.all(
    calls.map(async ({ id, name, args }) => {
      try {
        const result = await executeTool(name, args)
        return { id, name, result }
      } catch (e: any) {
        return { id, name, error: e.message ?? 'Unknown error' }
      }
    }),
  )
}