/**
 * app/api/ai/chat/route.ts
 *
 * Streaming chat endpoint with an agentic tool-calling loop.
 * Tool definitions and executors live in ../tools/ — keep this file
 * focused on transport / streaming only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { TOOLS } from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/executors'

const ACCOUNT_ID = '342bdd8fddcbe228eb8c1d289d73da5a'
const API_TOKEN  = 'cfut_HcLxCCwJqdOs7Ma6hBPHIusyjh13pTHzhLOKjj6H7630b643'
const MODEL      = process.env.CLOUDFLARE_AI_MODEL ?? '@cf/moonshotai/kimi-k2.5'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const toolList = TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')

  return `You are Parallaxa.ai, an intelligent news-management assistant. Today is ${new Date().toUTCString()}.

You have access to the following tools. When you need to use a tool emit ONLY this XML — nothing else on that line:
<tool_call>{"name":"<tool_name>","arguments":{<json_args>}}</tool_call>

Available tools:
${toolList}

Rules:
1. Use tools whenever the user wants to search, read, create, update, or publish articles, or interact with the pipeline / social posting.
2. After a tool call, wait for the result and incorporate it naturally into your reply.
3. You may chain multiple tool calls in sequence.
4. When NOT using tools, respond in clear Markdown.
5. NEVER show raw <tool_call> tags in your final reply — they are internal only.
6. For destructive or irreversible actions (run_news_pipeline, trigger_ptp) always confirm intent with the user first unless they have already confirmed.`
}

// ─── Tool-call XML parsing ────────────────────────────────────────────────────

interface ToolCall { name: string; args: Record<string, any> }

function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = []
  const pattern = /<tool_call>([\s\S]*?)<\/tool_call>/g
  let m: RegExpExecArray | null

  while ((m = pattern.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1])
      calls.push({ name: obj.name, args: obj.arguments ?? obj.args ?? {} })
    } catch {
      // malformed JSON — skip
    }
  }
  return calls
}

function stripToolCallXml(text: string): string {
  let out = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
  out = out.replace(/<tool_call>[\s\S]*$/, '')   // partial opening tag still streaming
  out = out.replace(/<\/tool_call>/g, '')
  return out
}

// ─── Agentic streaming loop ───────────────────────────────────────────────────

async function runAgentLoop(
  messages: Message[],
  temperature: number,
  enqueue: (chunk: string) => void
): Promise<void> {
  const MAX_ITERATIONS = 6
  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`

  const history: Message[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...messages,
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: history,
        stream: true,
        temperature,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!cfRes.ok) {
      enqueue(`\n\n**API error:** ${cfRes.statusText}`)
      return
    }

    const reader = cfRes.body?.getReader()
    if (!reader) { enqueue('No response body'); return }

    const decoder = new TextDecoder()
    let fullText  = ''
    let buffer    = ''

    // ── Stream SSE chunks ──────────────────────────────────────────────────
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const content: string =
            parsed.choices?.[0]?.delta?.content ??
            parsed.response ??
            (typeof parsed === 'string' ? parsed : '')

          if (!content) continue
          fullText += content
          buffer   += content

          // Hold back potential partial <tool_call> opening tag
          const tagStart = buffer.indexOf('<tool_call>')
          if (tagStart === -1) {
            const safe = buffer.slice(0, -11)
            if (safe.length > 0) { enqueue(safe); buffer = buffer.slice(-11) }
          } else if (tagStart > 0) {
            enqueue(buffer.slice(0, tagStart))
            buffer = buffer.slice(tagStart)
          }
          // tagStart === 0: entire buffer is inside tool_call — hold it all
        } catch { /* ignore parse errors */ }
      }
    }

    // Flush remaining buffer (strip any tool_call XML)
    if (buffer) {
      const flushed = stripToolCallXml(buffer)
      if (flushed.trim()) enqueue(flushed)
    }

    // ── Check for tool calls ───────────────────────────────────────────────
    const toolCalls = parseToolCalls(fullText)
    if (toolCalls.length === 0) break  // no tools → done

    // Keep raw assistant message (with tool_call XML) in history
    history.push({ role: 'assistant', content: fullText })

    // Execute each tool, stream status to client
    for (const tc of toolCalls) {
      enqueue(`\n\n> 🔧 **Tool:** \`${tc.name}\`\n\n`)
      const result = await executeTool(tc.name, tc.args)
      enqueue(`> ✅ **Result received**\n\n`)
      history.push({
        role: 'user',
        content: `[Tool result for ${tc.name}]:\n${result}`,
      })
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, temperature = 0.7 } = await req.json()

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
    }

    const validMessages: Message[] = messages.map((m: any) => ({
      role: m.role ?? 'user',
      content: m.content ?? '',
    }))

    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (text: string) =>
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          )
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
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}