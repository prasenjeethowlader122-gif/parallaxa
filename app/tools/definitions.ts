/**
 * app/api/ai/tools/definitions.ts
 *
 * AI tool definitions — passed to the LLM so it knows what tools
 * are available and what arguments each one expects.
 */

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string; enum?: string[] }>
    required: string[]
  }
}

export const TOOLS: ToolDefinition[] = [
  // ── Article Search ─────────────────────────────────────────────────────────
  {
    name: 'search_articles',
    description:
      'Search published articles in the database by keyword, category, or free-text query. ' +
      'Use when the user asks to find, list, or look up articles.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search term (title, description, or content)',
        },
        category: {
          type: 'string',
          description: 'Filter by category slug (optional)',
        },
        limit: {
          type: 'string',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['query'],
    },
  },

  // ── Get Article by ID ──────────────────────────────────────────────────────
  {
    name: 'get_article',
    description:
      'Fetch the full content of a single article by its ID. ' +
      'Use when the user asks to read, summarise, or analyse a specific article.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The article UUID or numeric ID',
        },
      },
      required: ['id'],
    },
  },

  // ── Generate Article ───────────────────────────────────────────────────────
  {
    name: 'generate_article',
    description:
      'Generate a complete news article (title, description, content, SEO fields) ' +
      'using AI, then save it as a draft in the database. ' +
      'Use when the user asks to write, create, or generate a new article.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic or headline idea for the article',
        },
        category: {
          type: 'string',
          description: 'Article category (e.g. politics, sports, tech)',
        },
        tone: {
          type: 'string',
          description: 'Writing tone: neutral | formal | conversational',
          enum: ['neutral', 'formal', 'conversational'],
        },
        length: {
          type: 'string',
          description: 'Approximate length: short (~300w) | medium (~600w) | long (~1200w)',
          enum: ['short', 'medium', 'long'],
        },
      },
      required: ['topic', 'category'],
    },
  },

  // ── Trigger PTP (Post-to-Platform) ─────────────────────────────────────────
  {
    name: 'trigger_ptp',
    description:
      'Trigger the Post-to-Platform (PTP) pipeline for a given article — ' +
      'renders an OG image, generates a caption, and posts to Facebook/social. ' +
      'Use when the user asks to share, post, or publish an article to social media.',
    parameters: {
      type: 'object',
      properties: {
        articleId: {
          type: 'string',
          description: 'The ID of the article to post',
        },
      },
      required: ['articleId'],
    },
  },

  // ── Check PTP / Pipeline Job Status ───────────────────────────────────────
  {
    name: 'check_job_status',
    description:
      'Check the current status of a background pipeline job (PTP or news pipeline) ' +
      'using its eventId. Use when the user asks about progress of a previously started job.',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'The Inngest event ID returned when the job was started',
        },
      },
      required: ['eventId'],
    },
  },

  // ── Run News Pipeline ──────────────────────────────────────────────────────
  {
    name: 'run_news_pipeline',
    description:
      'Trigger the automated news ingestion pipeline that scrapes sources, ' +
      'generates articles, and saves them as drafts. ' +
      'Use when the user asks to run, start, or trigger the news pipeline.',
    parameters: {
      type: 'object',
      properties: {
        confirm: {
          type: 'string',
          description: 'Must be "yes" to confirm the pipeline should run',
        },
      },
      required: ['confirm'],
    },
  },

  // ── List My Articles ───────────────────────────────────────────────────────
  {
    name: 'list_my_articles',
    description:
      'List articles created by the current user, with optional status filter. ' +
      'Use when the user asks to see their own drafts, published posts, or article list.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status: draft | published | scheduled | all (default: all)',
          enum: ['draft', 'published', 'scheduled', 'all'],
        },
      },
      required: [],
    },
  },

  // ── Update Article ─────────────────────────────────────────────────────────
  {
    name: 'update_article',
    description:
      'Update fields of an existing article (e.g. publish it, change the title, ' +
      'fix the category). Use when the user asks to edit, update, or publish an article.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The article ID to update',
        },
        fields: {
          type: 'string',
          description:
            'JSON-stringified object of fields to update ' +
            '(e.g. {"status":"published","title":"New title"})',
        },
      },
      required: ['id', 'fields'],
    },
  },
]