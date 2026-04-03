import { z } from 'zod'

// ─── Tool Registry Types ───────────────────────────────────────────────────────

export type ToolCategory = 'search' | 'database' | 'rag' | 'utility' | 'news'

export interface ToolMeta {
  name: string
  description: string
  category: ToolCategory
  icon: string
  parameters: Record<string, unknown>  // JSON Schema
  schema: z.ZodType<any>               // Zod for runtime validation
  timeout?: number
  retries?: number
  cacheable?: boolean
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

export const TOOLS: ToolMeta[] = [
  // ── RAG / Vector Search ────────────────────────────────────────────────────
  {
    name: 'semantic_search',
    description: 'Semantically search the internal article database using natural-language queries. ' +
      'Returns the most relevant articles ranked by cosine similarity. ' +
      'Use this when the user asks about news, events, topics, or wants context from past articles.',
    category: 'rag',
    icon: '🔍',
    timeout: 15000,
    cacheable: true,
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional().default(5),
      threshold: z.number().min(0).max(1).optional().default(0.5),
      category: z.string().optional(),
    }),
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: {
          type: 'string',
          description: 'Natural language query to semantically search for relevant articles',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (1–20, default 5)',
          default: 5,
        },
        threshold: {
          type: 'number',
          description: 'Similarity threshold 0–1 (lower = stricter match). Default 0.5',
          default: 0.5,
        },
        category: {
          type: 'string',
          description: 'Optional: filter by category (Business, Technology, Sports, Entertainment, Science, Health, World)',
        },
      },
    },
  },
  
  // ── Full-text Search ───────────────────────────────────────────────────────
  {
    name: 'search_articles',
    description: 'Full-text keyword search of articles (title, description, content). ' +
      'Use when the user wants to find articles by exact keywords or phrases.',
    category: 'search',
    icon: '📰',
    cacheable: true,
    schema: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional().default(10),
    }),
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Keyword or phrase to search for' },
        limit: { type: 'number', description: 'Max results (default 10)', default: 10 },
      },
    },
  },
  
  // ── Category Browse ────────────────────────────────────────────────────────
  {
    name: 'get_articles_by_category',
    description: 'Fetch the latest published articles for a specific category. ' +
      'Categories: Business, Technology, Sports, Entertainment, Science, Health, World.',
    category: 'news',
    icon: '🗂️',
    cacheable: true,
    schema: z.object({
      category: z.enum(['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health',
        'World'
      ]),
      limit: z.number().int().min(1).max(20).optional().default(5),
    }),
    parameters: {
      type: 'object',
      required: ['category'],
      properties: {
        category: {
          type: 'string',
          enum: ['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health', 'World'],
        },
        limit: { type: 'number', default: 5 },
      },
    },
  },
  
  // ── Breaking / Featured / Trending ────────────────────────────────────────
  {
    name: 'get_breaking_news',
    description: 'Fetch the latest breaking news articles.',
    category: 'news',
    icon: '🚨',
    cacheable: false,
    schema: z.object({}),
    parameters: { type: 'object', properties: {} },
  },
  
  {
    name: 'get_featured_articles',
    description: 'Get the top featured/highlighted articles.',
    category: 'news',
    icon: '⭐',
    cacheable: true,
    schema: z.object({}),
    parameters: { type: 'object', properties: {} },
  },
  
  {
    name: 'get_trending_articles',
    description: 'Get the most-viewed trending articles.',
    category: 'news',
    icon: '📈',
    cacheable: true,
    schema: z.object({}),
    parameters: { type: 'object', properties: {} },
  },
  
  // ── Article Lookup ─────────────────────────────────────────────────────────
  {
    name: 'get_article_by_slug',
    description: 'Retrieve the full content of a specific article by its URL slug.',
    category: 'database',
    icon: '📄',
    cacheable: true,
    schema: z.object({ slug: z.string().min(1) }),
    parameters: {
      type: 'object',
      required: ['slug'],
      properties: { slug: { type: 'string', description: 'The article URL slug' } },
    },
  },
  
  // ── RAG: Inject context  ──────────────────────────────────────────────────
  {
    name: 'get_context_for_question',
    description: 'Retrieve the most relevant article excerpts to answer a factual question. ' +
      'Returns structured context chunks suitable for grounding your answer. ' +
      'Always use this before answering questions about specific events, people, or topics.',
    category: 'rag',
    icon: '🧠',
    timeout: 20000,
    cacheable: true,
    schema: z.object({
      question: z.string().min(1),
      max_chunks: z.number().int().min(1).max(10).optional().default(4),
    }),
    parameters: {
      type: 'object',
      required: ['question'],
      properties: {
        question: {
          type: 'string',
          description: 'The factual question to gather context for',
        },
        max_chunks: {
          type: 'number',
          description: 'Number of context chunks to retrieve (1–10, default 4)',
          default: 4,
        },
      },
    },
  },
  
  // ── Summarise Article ──────────────────────────────────────────────────────
  {
    name: 'summarize_article',
    description: 'Fetch an article by slug and return a concise structured summary.',
    category: 'utility',
    icon: '✂️',
    cacheable: true,
    schema: z.object({
      slug: z.string().min(1),
      length: z.enum(['short', 'medium', 'long']).optional().default('medium'),
    }),
    parameters: {
      type: 'object',
      required: ['slug'],
      properties: {
        slug: { type: 'string' },
        length: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
          default: 'medium',
          description: 'Desired summary length',
        },
      },
    },
  },
  
  // ── Date-based search ─────────────────────────────────────────────────────
  {
    name: 'get_articles_by_date',
    description: 'Fetch published articles from a specific date (YYYY-MM-DD format).',
    category: 'database',
    icon: '📅',
    cacheable: true,
    schema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    parameters: {
      type: 'object',
      required: ['date'],
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
      },
    },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]))

export function getToolMeta(name: string): ToolMeta | undefined {
  return TOOL_MAP.get(name)
}

/** Format tools for the OpenAI /chat/completions API */
export function toOpenAITools() {
  return TOOLS.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}