import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TOOLS } from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/executors'

const API_KEY = process.env.GEMINI_API_KEY || ''
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'
const MODEL = 'gemini-3-flash-preview'

if (!API_KEY) {
  console.warn('[chat/route] GEMINI_API_KEY is not set — requests will fail.')
}

const openai = new OpenAI({
  apiKey:  'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk',
  baseURL: BASE_URL,
})

const formattedTools: OpenAI.Chat.Completions.ChatCompletionTool[] = TOOLS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}))

async function runAgentLoop(
  messages: any[],
  temperature: number,
  enqueue: (chunk: string) => void
) {
  const MAX_ITERATIONS = 6
  const history: any[] = [
    {
      role: 'system',
      content: `You are Parallaxa.ai, a news assistant. Use tools for all news actions.`,
    },
    ...messages,
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>

    try {
      stream = await openai.chat.completions.create({
        model: MODEL,
        messages: history,
        tools: formattedTools,
        tool_choice: 'auto',
        stream: true,
        temperature,
      })
    } catch (err: any) {
      const msg = err?.message ?? 'Unknown API error'
      enqueue(`\n\n**API Error:** ${msg}`)
      break
    }

    let fullText = ''
    const toolCalls: Record<number, { id: string; name: string; args: string }> = {}

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      if (delta?.content) {
        fullText += delta.content
        enqueue(delta.content)
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCalls[idx]) {
            toolCalls[idx] = { id: '', name: '', args: '' }
          }
          if (tc.id) toolCalls[idx].id = tc.id
          if (tc.function?.name) toolCalls[idx].name += tc.function.name
          if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments
        }
      }
    }

    const toolCallList = Object.values(toolCalls)
    if (toolCallList.length === 0) break

    history.push({
      role: 'assistant',
      content: fullText || null,
      tool_calls: toolCallList.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args },
      })),
    })

    for (const tc of toolCallList) {
      enqueue(`\n\n> **Calling tool:** \`${tc.name}\``)

      let parsedArgs: Record<string, any> = {}
      try {
        parsedArgs = JSON.parse(tc.args || '{}')
      } catch {
        parsedArgs = {}
      }

      let result: string
      try {
        result = await executeTool(tc.name, parsedArgs)
        enqueue(`\n\n> **Tool result received**\n\n`)
      } catch (e: any) {
        result = `Error: ${e?.message ?? 'Unknown tool error'}`
        enqueue(`\n\n> **Tool error:** ${result}\n\n`)
      }

      history.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
    }
  }
}

export async function POST(req: NextRequest) {
  // Guard: ensure body exists and is valid JSON
  let body: { messages?: any[]; temperature?: number }
  try {
    const raw = await req.text()
    if (!raw || raw.trim() === '') {
      return NextResponse.json(
        { error: 'Request body is empty. Send { messages: [...] }.' },
        { status: 400 }
      )
    }
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json(
      { error: 'Request body is not valid JSON.' },
      { status: 400 }
    )
  }

  const { messages, temperature = 0.7 } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: '`messages` must be a non-empty array.' },
      { status: 400 }
    )
  }

  if (!API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const enqueue = (text: string) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
          )
        } catch {
          // controller already closed — ignore
        }
      }

      try {
        await runAgentLoop(messages, temperature, enqueue)
      } catch (err: any) {
        console.error('[chat/route] Agent loop error:', err)
        enqueue(`\n\n**Error:** ${err?.message ?? 'Failed to generate response'}`)
      } finally {
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch {
          // already closed
        }
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
}