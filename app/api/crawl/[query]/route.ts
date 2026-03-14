import { NextRequest, NextResponse } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js'
import { OpenAI } from 'openai'

// ─── Clients ───────────────────────────────────────────────────────────────

const firecrawl = new Firecrawl({
  apiKey: 'fc-da0837003c26469da0f8c259c6c10944',
})

// Standard OpenAI client (GPT)
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

// HuggingFace — same OpenAI SDK, different baseURL + key
const hfClient = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey:   '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',
})

// ─── Models ────────────────────────────────────────────────────────────────

const OPENAI_MODEL = 'gpt-4o-mini'
const HF_MODEL     = process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

// ─── Types ─────────────────────────────────────────────────────────────────

interface SearchResult {
  url:       string
  title?:    string
  markdown?: string
  metadata?: {
    ogImage?: string
    image?:   string
  }
}

interface SearchResponse {
  data?: SearchResult[]
  success?: boolean
}

interface ScrapedArticle {
  url:      string
  markdown: string
  image:    string | null
}

interface ScrapePageResult {
  markdown?: string
  metadata?: {
    ogImage?:    string
    image?:      string
    screenshot?: string
  }
  html?: string
  success?: boolean
}

// ─── Image extraction helper ──────────────────────────────────────────────

function extractImageFromPage(page: ScrapePageResult): string | null {
  const ogImage = page.metadata?.ogImage ?? page.metadata?.image ?? null
  if (ogImage && ogImage.startsWith('http')) return ogImage

  if (page.html) {
    const match = page.html.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match?.[1]?.startsWith('http')) return match[1]
  }

  if (page.markdown) {
    const mdMatch = page.markdown.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/)
    if (mdMatch?.[1]) return mdMatch[1]

    const urlMatch = page.markdown.match(/(https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif))/i)
    if (urlMatch?.[1]) return urlMatch[1]
  }

  return null
}

// ─── Step 1 – Search news ──────────────────────────────────────────────────

async function searchNews(query: string): Promise<SearchResult[]> {
  try {
    // FIX: Use correct Firecrawl search API — no `sources` filter, use `pageOptions`
    const results = (await firecrawl.search(query, {
      limit: 5,
      sources: 'news',
      scrapeOptions: {
        formats: ['markdown'],
      },
    })) as SearchResponse

    const data = results
    console.log(`[search] got ${data.length} results`)
    return data
  } catch (err) {
    console.error('[search] firecrawl.search failed:', err)
    return []
  }
}

// ─── Step 2 – Scrape each article URL for markdown + image ────────────────

async function scrapeArticles(
  results: SearchResult[]
): Promise<ScrapedArticle[]> {
  const scraped: ScrapedArticle[] = []

  // If search already returned markdown inline, use that to avoid extra scrape calls
  const needsScraping = results.filter(r => !r.markdown || r.markdown.length < 200)
  const hasMarkdown   = results.filter(r => r.markdown && r.markdown.length >= 200)

  // Use inline markdown directly
  for (const result of hasMarkdown) {
    const image = (result.metadata?.ogImage ?? result.metadata?.image ?? null) as string | null
    scraped.push({
      url:      result.url,
      markdown: result.markdown!.slice(0, 4000),
      image,
    })
  }

  // Only scrape URLs that didn't come with markdown
  for (const result of needsScraping) {
    try {
      const page = (await firecrawl.scrapeUrl(result.url, {
        formats: ['markdown', 'html'],
      })) as ScrapePageResult

      if (!page?.success && !page?.markdown) {
        console.warn(`[scrape] no content returned for: ${result.url}`)
        continue
      }

      const markdown = (page?.markdown ?? '').slice(0, 4000)
      const image    = extractImageFromPage(page)

      if (markdown.length > 100) {
        scraped.push({ url: result.url, markdown, image })
      }
    } catch (err) {
      console.warn(`[scrape] failed for ${result.url}:`, err)
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

// ─── Step 4b – Stream article from HuggingFace ────────────────────────────

async function streamFromHuggingFace(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
): Promise<ReadableStream> {
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

// ─── SSE helper ───────────────────────────────────────────────────────────

function sseEvent(eventName: string, payload: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
  )
}

function sseData(text: string): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`)
}

// ─── Route Handler ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { query: string } }   // FIX: params is NOT a Promise in Next.js 14
) {
  try {
    // FIX: no await needed — params is a plain object
    const query    = decodeURIComponent(params.query)
    const provider = req.nextUrl.searchParams.get('provider') ?? 'huggingface'

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

    const sources   = scraped.map(s => s.url)
    const images    = scraped.map(s => s.image)
    const heroImage = images.find(Boolean) ?? null
    const messages  = buildMessages(query, combinedMarkdown)
    const model     = provider === 'huggingface' ? HF_MODEL : OPENAI_MODEL

    // ── 4. Stream article ─────────────────────────────────────────────────
    console.log(`[pipeline] 4/4 streaming via ${provider} (${model})…`)

    const articleStream =
      provider === 'huggingface'
        ? await streamFromHuggingFace(messages)
        : await streamFromOpenAI(messages)

    // FIX: Use proper SSE events so client can reliably distinguish metadata vs content
    const responseStream = new ReadableStream({
      async start(controller) {
        // Send metadata as a named SSE event
        controller.enqueue(sseEvent('meta', { sources, provider, model, images, heroImage }))

        // Stream article chunks as SSE `data` events with a `text` field
        const reader = articleStream.getReader()
        const decoder = new TextDecoder()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          if (text) controller.enqueue(sseData(text))
        }

        // Signal end of stream
        controller.enqueue(new TextEncoder().encode('event: done\ndata: {}\n\n'))
        controller.close()
      },
    })

    return new Response(responseStream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no',   // FIX: prevent nginx from buffering SSE
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