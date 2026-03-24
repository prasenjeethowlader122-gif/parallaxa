import { NextRequest, NextResponse } from 'next/server'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '342bdd8fddcbe228eb8c1d289d73da5a'
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'cfut_HcLxCCwJqdOs7Ma6hBPHIusyjh13pTHzhLOKjj6H7630b643'
const MODEL = process.env.CLOUDFLARE_AI_MODEL || '@cf/moonshotai/kimi-k2.5'
const SERPER_API_KEY = process.env.SERPER_API_KEY || ''

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, or any topic. Use this when the user asks about recent events, needs factual info, or requests research.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query to look up' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_url',
    description: 'Fetch and read the content of a URL. Use when the user shares a link or asks to summarize/analyze a webpage.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch' },
      },
      required: ['url'],
    },
  },
  {
    name: 'read_file',
    description: 'Read and analyze a file that the user has uploaded. Supports text, JSON, CSV, and code files.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Name of the uploaded file' },
        content: { type: 'string', description: 'Base64 encoded file content' },
        mimeType: { type: 'string', description: 'MIME type of the file' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'run_code',
    description: 'Execute JavaScript/TypeScript code and return the result. Useful for calculations, data transformations, and logic tasks.',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JavaScript code to execute' },
        language: { type: 'string', description: 'Language: javascript or typescript', default: 'javascript' },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_weather',
    description: 'Get current weather for a location.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or location' },
      },
      required: ['location'],
    },
  },
]

// ─── Tool Executors ───────────────────────────────────────────────────────────

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case 'web_search':
      return await toolWebSearch(args.query)
    case 'fetch_url':
      return await toolFetchUrl(args.url)
    case 'read_file':
      return await toolReadFile(args.filename, args.content, args.mimeType)
    case 'run_code':
      return toolRunCode(args.code)
    case 'get_weather':
      return await toolGetWeather(args.location)
    default:
      return `Unknown tool: ${name}`
  }
}

async function toolWebSearch(query: string): Promise<string> {
  try {
    if (SERPER_API_KEY) {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 5 }),
      })
      const data = await res.json()
      const results = data.organic?.slice(0, 5).map((r: any, i: number) =>
        `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.link}`
      ).join('\n\n')
      return `Search results for "${query}":\n\n${results || 'No results found.'}`
    }

    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    )
    const data = await res.json()
    const answer = data.AbstractText || data.Answer || data.Definition || ''
    const related = data.RelatedTopics?.slice(0, 3).map((t: any) => t.Text || '').filter(Boolean).join('\n') || ''
    return `Search results for "${query}":\n\n${answer}\n\n${related}`.trim() || 'No results found.'
  } catch (e) {
    return `Search failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

async function toolFetchUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ParallaxaBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '\n\n')
      .slice(0, 4000)
    return `Content from ${url}:\n\n${text}`
  } catch (e) {
    return `Failed to fetch URL: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

async function toolReadFile(filename: string, content: string, mimeType?: string): Promise<string> {
  try {
    const decoded = Buffer.from(content, 'base64').toString('utf-8')
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'json') {
      const parsed = JSON.parse(decoded)
      return `File "${filename}" (JSON):\n\n${JSON.stringify(parsed, null, 2).slice(0, 3000)}`
    }
    if (ext === 'csv') {
      const lines = decoded.split('\n').slice(0, 50)
      return `File "${filename}" (CSV, first 50 rows):\n\n${lines.join('\n')}`
    }
    return `File "${filename}":\n\n${decoded.slice(0, 4000)}`
  } catch (e) {
    return `Failed to read file: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

function toolRunCode(code: string): string {
  try {
    const banned = ['require', 'import', 'fetch', 'fs.', 'process.', 'eval', 'Function', 'XMLHttpRequest']
    for (const b of banned) {
      if (code.includes(b)) return `Execution blocked: "${b}" is not allowed for security reasons.`
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function(`
      "use strict";
      const console = { log: (...a) => _logs.push(a.map(String).join(' ')), error: (...a) => _logs.push('[error] ' + a.map(String).join(' ')) };
      const _logs = [];
      ${code}
      return _logs;
    `)
    const logs = fn()
    return `Code output:\n${logs.join('\n') || '(no output)'}`
  } catch (e) {
    return `Code error: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

async function toolGetWeather(location: string): Promise<string> {
  try {
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    const cur = data.current_condition?.[0]
    if (!cur) return `Could not get weather for "${location}"`
    const desc = cur.weatherDesc?.[0]?.value || 'Unknown'
    return `Weather in ${location}: ${desc}, ${cur.temp_C}°C (feels like ${cur.FeelsLikeC}°C), humidity ${cur.humidity}%, wind ${cur.windspeedKmph} km/h`
  } catch (e) {
    return `Weather fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`
  }
}

// ─── Tool-call parsing ────────────────────────────────────────────────────────

interface ToolCall {
  name: string
  args: Record<string, any>
}

function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = []

  const xmlPattern = /<tool_call>([\s\S]*?)<\/tool_call>/g
  let m
  while ((m = xmlPattern.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1])
      calls.push({ name: obj.name, args: obj.arguments || obj.args || {} })
    } catch {}
  }

  const jsonPattern = /\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[\s\S]*?\})\}/g
  while ((m = jsonPattern.exec(text)) !== null) {
    try {
      calls.push({ name: m[1], args: JSON.parse(m[2]) })
    } catch {}
  }

  return calls
}

// ─── Strip tool_call XML from text ───────────────────────────────────────────
// Removes complete <tool_call>...</tool_call> blocks and any partial opening
// tag that is still streaming in (so it never leaks to the client).

function stripToolCallXml(text: string): string {
  // Remove complete blocks
  let cleaned = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
  // Remove partial opening tag that hasn't closed yet (still streaming)
  cleaned = cleaned.replace(/<tool_call>[\s\S]*$/, '')
  // Remove any leftover orphan closing tag
  cleaned = cleaned.replace(/<\/tool_call>/g, '')
  return cleaned
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are Parallaxa.ai, an intelligent assistant with tool-calling capabilities. Today is ${new Date().toUTCString()}.

You have access to the following tools. When you need to use a tool, emit a tool call in this exact XML format — nothing else on that line:
<tool_call>{"name":"<tool_name>","arguments":{<json_args>}}</tool_call>

Available tools:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Rules:
1. Call tools when the user's request requires real-time data, web content, file analysis, or code execution.
2. After calling a tool, wait for the result, then continue your response incorporating the result naturally.
3. You may call multiple tools in sequence.
4. When NOT using tools, respond normally in Markdown.
5. Be concise and helpful. Cite sources when using web search.
6. NEVER show raw <tool_call> tags in your final response text. Tool calls are internal only.`
}

// ─── Agentic Loop ─────────────────────────────────────────────────────────────

async function runAgentLoop(
  messages: Message[],
  temperature: number,
  enqueue: (chunk: string) => void
): Promise<void> {
  const maxIterations = 5
  let iteration = 0
  const agentMessages: Message[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...messages,
  ]

  while (iteration < maxIterations) {
    iteration++
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`

    const response = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: agentMessages,
        stream: true,
        temperature,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      enqueue(`\n\n**API error:** ${response.statusText}`)
      return
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    // Buffer holds text that might be a partial <tool_call> tag still streaming in
    let streamBuffer = ''

    if (!reader) { enqueue('No response body'); return }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })

      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        if (!data) continue

        try {
          const parsed = JSON.parse(data)
          let content = ''
          if (parsed.choices?.[0]?.delta?.content) content = parsed.choices[0].delta.content
          else if (parsed.response) content = parsed.response
          else if (typeof parsed === 'string') content = parsed

          if (content) {
            fullText += content
            streamBuffer += content

            // Flush everything that is definitely not part of an opening <tool_call> tag.
            // We hold back text once we see a '<' that could be starting a tool_call block.
            const tagStart = streamBuffer.indexOf('<tool_call>')
            if (tagStart === -1) {
              // No tool_call tag anywhere in buffer — but hold back last 11 chars
              // in case '<tool_call>' is split across two chunks.
              const safe = streamBuffer.slice(0, -11)
              if (safe.length > 0) {
                enqueue(safe)
                streamBuffer = streamBuffer.slice(-11)
              }
            } else if (tagStart > 0) {
              // Flush text before the tag, hold back the rest
              enqueue(streamBuffer.slice(0, tagStart))
              streamBuffer = streamBuffer.slice(tagStart)
            }
            // else: tagStart === 0 — entire buffer is inside a tool_call, hold it all
          }
        } catch {}
      }
    }

    // Flush any remaining buffer, stripping tool_call XML
    if (streamBuffer) {
      const flushed = stripToolCallXml(streamBuffer)
      if (flushed.trim()) enqueue(flushed)
    }

    // Check if the model made tool calls
    const toolCalls = parseToolCalls(fullText)
    if (toolCalls.length === 0) {
      break
    }

    // Add assistant message to history (with the raw tool calls intact for history)
    agentMessages.push({ role: 'assistant', content: fullText })

    // Execute each tool call and stream status to client
    for (const tc of toolCalls) {
      enqueue(`\n\n>**Calling tool:** \`${tc.name}\` with ${JSON.stringify(tc.args)}\n\n`)
      const result = await executeTool(tc.name, tc.args)
      enqueue(`>**Tool result received**\n\n`)
      agentMessages.push({
        role: 'user',
        content: `[Tool result for ${tc.name}]:\n${result}`,
      })
    }
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, temperature = 0.7 } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 })
    }

    const validMessages: Message[] = messages.map((m: any) => ({
      role: m.role || 'user',
      content: m.content || '',
    }))

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (text: string) => {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          )
        }
        try {
          await runAgentLoop(validMessages, temperature, enqueue)
        } catch (err) {
          enqueue(`\n\n**Error:** ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}