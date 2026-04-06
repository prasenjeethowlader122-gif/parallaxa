import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { toOpenAITools, getToolMeta } from '@/lib/tools/definitions'
import { executeTool, executeToolsInParallel } from '@/lib/tools/executors'

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY = process.env.OPENROUTER_API_KEY ?? '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'
const BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'nvidia/nemotron-3-super-120b-a12b:free'

const openai = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL })

const SYSTEM_PROMPT = `You are Parallaxa, an intelligent news assistant with access to a curated article database.

## Capabilities
- Semantic (RAG) search to retrieve contextually relevant articles
- Full-text keyword search
- Category and date-based browsing
- Breaking news, trending, and featured articles

## Guidelines
1. **Always use tools** before answering factual questions about events, news, or topics.
2. **Prefer \`get_context_for_question\`** for factual grounding — it returns ready-to-use context chunks.
3. **Cite sources** by mentioning article titles and slugs when referencing retrieved content.
4. **Run multiple tools in parallel** when the user asks about multiple topics.
5. If no relevant articles are found, say so clearly and offer to search differently.
6. Respond in clear, well-formatted Markdown.
7. Keep answers concise but complete. Use bullet points and headers for lists.`

// ─── Streaming SSE helper ─────────────────────────────────────────────────────

/**
 * use inngest ai infra with open ai, and Google search api for web search and read /lib/inngest/functions.ts file and use web scraping tool api **/
 */