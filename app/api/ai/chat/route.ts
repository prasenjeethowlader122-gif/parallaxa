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

type Enqueue = (payload: object) => void

function makeEnqueue(controller: ReadableStreamDefaultController, encoder: TextEncoder): Enqueue {
  return (payload: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

async function runAgentLoop(
  userMessages: any[],
  temperature: number,
  enqueue: Enqueue,
) {
  const MAX_ITERATIONS = 8
  const history: any[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages,
  ]

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // ── Stream the LLM response ────────────────────────────────────────────
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: history,
      tools: toOpenAITools(),
      tool_choice: 'auto',
      stream: true,
      temperature,
    })

    let fullText = ''
    const toolCallsMap = new Map<number, { id: string; name: string; args: string }>()

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta

      // Stream text content
      if (delta?.content) {
        fullText += delta.content
        enqueue({ type: 'text', content: delta.content })
      }

      // Accumulate tool calls (streamed in fragments)
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!toolCallsMap.has(idx)) {
            toolCallsMap.set(idx, { id: '', name: '', args: '' })
          }
          const entry = toolCallsMap.get(idx)!
          if (tc.id) entry.id = tc.id
          if (tc.function?.name) entry.name += tc.function.name
          if (tc.function?.arguments) entry.args += tc.function.arguments
        }
      }
    }

    const toolCalls = [...toolCallsMap.values()].filter((tc) => tc.name)

    // No tool calls → done
    if (toolCalls.length === 0) break

    // Emit tool-call start events to UI
    for (const tc of toolCalls) {
      const meta = getToolMeta(tc.name)
      enqueue({
        type: 'tool_start',
        id: tc.id,
        name: tc.name,
        icon: meta?.icon ?? '🔧',
        category: meta?.category ?? 'utility',
        args: tc.args,
      })
    }

    // Push assistant message with tool_calls
    history.push({
      role: 'assistant',
      content: fullText || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args },
      })),
    })

    // ── Execute tools (parallel if multiple) ──────────────────────────────
    const execInputs = toolCalls.map((tc) => {
      let parsedArgs: unknown = {}
      try { parsedArgs = JSON.parse(tc.args || '{}') } catch {}
      return { id: tc.id, name: tc.name, args: parsedArgs }
    })

    const results =
      execInputs.length === 1
        ? [
            await (async () => {
              const { id, name, args } = execInputs[0]
              try {
                const result = await executeTool(name, args)
                return { id, name, result }
              } catch (e: any) {
                return { id, name, error: e.message }
              }
            })(),
          ]
        : await executeToolsInParallel(execInputs)

    // Push results to history + emit to UI
    for (const res of results) {
      const content = res.error
        ? `Error: ${res.error}`
        : typeof res.result === 'string'
          ? res.result
          : JSON.stringify(res.result)

      enqueue({
        type: 'tool_result',
        id: res.id,
        name: res.name,
        success: !res.error,
        preview: content.slice(0, 120),
      })

      history.push({
        role: 'tool',
        tool_call_id: res.id,
        content,
      })
    }
    // Loop continues so the model can read tool results
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, temperature = 0.6 } = await req.json()

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const enqueue = makeEnqueue(controller, encoder)

        try {
          await runAgentLoop(messages, temperature, enqueue)
        } catch (err: any) {
          console.error('[agent] Loop error:', err)
          enqueue({ type: 'error', content: err.message ?? 'Failed to generate response' })
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: any) {
    console.error('[route] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}