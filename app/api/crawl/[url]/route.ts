import { NextRequest, NextResponse } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js'
import { OpenAI } from 'openai'

// ─── Clients ───────────────────────────────────────────────────────────────

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY ?? 'fc-da0837003c26469da0f8c259c6c10944',
})

// Standard OpenAI client (GPT)
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

// HuggingFace — same OpenAI SDK, different baseURL + key
const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey:  process.env.HF_TOKEN ?? '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',
})

// ─── Models ────────────────────────────────────────────────────────────────

const OPENAI_MODEL = 'gpt-4o-mini'
const HF_MODEL     = process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

// ─── Types ─────────────────────────────────────────────────────────────────

interface SearchResult {
  url:       string
  title?:    string
  markdown?: string
}

interface SearchResponse {
  data?: SearchResult[]
}

interface ScrapedArticle {
  url:      string
  markdown: string
  image:    string | null   // best image found for this article
}

interface ScrapePageResult {
  markdown?: string
  metadata?: {
    ogImage?:   string
    image?:     string
    screenshot?: string
  }
  html?: string
}

// ─── Image extraction helper ──────────────────────────────────────────────

/**
 * Pull the best image URL from a scraped page result.
 * Priority: og:image meta → first <img> in HTML → null
 */
function extractImageFromPage(page: ScrapePageResult): string | null {
  // 1. Firecrawl surfaces og:image in metadata
  const ogImage = page.metadata?.ogImage ?? page.metadata?.image ?? null
  if (ogImage && ogImage.startsWith('http')) return ogImage

  // 2. Fall back: parse first <img src="..."> from raw HTML
  if (page.html) {
    const match = page.html.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match?.[1]?.startsWith('http')) return match[1]
  }

  // 3. Fall back: look for image URLs inside the markdown
  if (page.markdown) {
    const mdMatch = page.markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
    if (mdMatch?.[1]) return mdMatch[1]

    // bare image URL pattern
    const urlMatch = page.markdown.match(/(https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif))/i)
    if (urlMatch?.[1]) return urlMatch[1]
  }

  return null
}

// ─── Step 1 – Search news ──────────────────────────────────────────────────

async function searchNews(query: string): Promise<SearchResult[]> {
  const results = (await firecrawl.search(query, {
    sources:       ['news'],
    scrapeOptions: { formats: ['markdown'] },
    limit:         3,
  })) as SearchResponse

  return results?.data ?? []
}

// ─── Step 2 – Scrape each article URL for markdown + image ────────────────

async function scrapeArticles(
  results: SearchResult[]
): Promise<ScrapedArticle[]> {
  const scraped: ScrapedArticle[] = []

  for (const result of results) {
    try {
      // Always do a full scrape so we get metadata (og:image etc.) + html
      const page = (await firecrawl.scrapeUrl(result.url, {
        formats: ['markdown', 'html'],   // html needed for img fallback
      })) as ScrapePageResult

      const markdown = (page?.markdown ?? result.markdown ?? '').slice(0, 4000)
      const image    = extractImageFromPage(page)

      if (markdown) {
        scraped.push({ url: result.url, markdown, image })
      }
    } catch {
      console.warn(`[scrape] failed: ${result.url}`)

      // Still keep search-inline markdown if scrape failed
      if (result.markdown && result.markdown.length > 200) {
        scraped.push({ url: result.url, markdown: result.markdown.slice(0, 4000), image: null })
      }
    }
  }

  return scraped
}

// ─── Step 3 – Build prompt messages ───────────────────────────────────────

function buildMessages(
  query: string,
  combinedMarkdown: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {
      role: 'system',
      content: `You are a professional news journalist.
Write a clear, engaging, well-structured news article based solely on the source material provided.
Your response must follow this exact format:

TITLE: <compelling headline>
---
<article body in 4–5 paragraphs, no markdown formatting>`,
    },
    {
      role: 'user',
      content: `Topic: "${query}"\n\nSource material:\n\n${combinedMarkdown}`,
    },
  ]
}

// ─── Step 4a – Stream article from OpenAI ─────────────────────────────────

async function streamFromOpenAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<ReadableStream> {
  const stream = await openaiClient.chat.completions.create({
    model:       OPENAI_MODEL,
    messages,
    stream:      true,
    max_tokens:  1200,
    temperature: 0.6,
  })

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(new TextEncoder().encode(text))
      }
      controller.close()
    },
  })
}

// ─── Step 4b – Stream article from HuggingFace via OpenAI-compatible router

async function streamFromHuggingFace(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<ReadableStream> {
  // Identical API shape to OpenAI — just a different client instance
  const stream = await hfClient.chat.completions.create({
    model:       HF_MODEL,
    messages,
    stream:      true,
    max_tokens:  1200,
    temperature: 0.6,
  })

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) controller.enqueue(new TextEncoder().encode(text))
      }
      controller.close()
    },
  })
}

// ─── Route Handler ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  try {
    const { url: rawQuery } = await params
    const query    = decodeURIComponent(rawQuery)

    // ?provider=openai (default) | ?provider=huggingface
    const provider = req.nextUrl.searchParams.get('provider') ?? 'openai'

    // ── 1. Search ─────────────────────────────────────────────────────────
    console.log(`[pipeline] 1/4 searching: "${query}"`)
    const searchResults = await searchNews(query)

    if (!searchResults.length) {
      return NextResponse.json({ error: 'No search results found.' }, { status: 404 })
    }

    // ── 2. Scrape ─────────────────────────────────────────────────────────
    console.log(`[pipeline] 2/4 scraping ${searchResults.length} articles…`)
    const scraped = await scrapeArticles(searchResults)

    if (!scraped.length) {
      return NextResponse.json({ error: 'Could not scrape any articles.' }, { status: 500 })
    }

    // ── 3. Combine markdown (cap total at ~8 000 chars) ───────────────────
    console.log(`[pipeline] 3/4 building prompt…`)
    const combinedMarkdown = scraped
      .map((s, i) => `### Source ${i + 1}: ${s.url}\n\n${s.markdown}`)
      .join('\n\n---\n\n')
      .slice(0, 8000)

    const sources  = scraped.map(s => s.url)
    const images   = scraped.map(s => s.image)          // parallel array — null if not found
    const heroImage = images.find(Boolean) ?? null      // first non-null image = hero
    const messages = buildMessages(query, combinedMarkdown)
    const model    = provider === 'huggingface' ? HF_MODEL : OPENAI_MODEL

    // ── 4. Stream article ─────────────────────────────────────────────────
    console.log(`[pipeline] 4/4 streaming via ${provider} (${model})…`)

    const articleStream =
      provider === 'huggingface'
        ? await streamFromHuggingFace(messages)
        : await streamFromOpenAI(messages)

    // Prepend a single metadata line so the client knows sources + model + images
    const metaLine = `data: ${JSON.stringify({ sources, provider, model, images, heroImage })}\n\n`

    const responseStream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode(metaLine))

        const reader = articleStream.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
        controller.close()
      },
    })

    return new Response(responseStream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  } catch (e) {
    console.error('[pipeline] error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}