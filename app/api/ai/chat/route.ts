import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TOOLS } from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/executors'

// Configuration - Use Environment Variables for Production
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'
const MODEL = 'gemini-3-flash-preview' // Best for tool calling + high rate limits

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: BASE_URL,
})

// Map your tool definitions to OpenAI's required JSON Schema format
const formattedTools: OpenAI.Chat.Completions.ChatCompletionTool[] = TOOLS.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters, // Ensure this is a valid JSON Schema object
  },
}))

async function runAgentLoop(
  messages: any[],
  temperature: number,
  enqueue: (chunk: string) => void
) {
  const MAX_ITERATIONS = 6
  const history: any[] = [
    { role: 'system', content: `You are Parallaxa.ai, a news assistant. Use tools for all news actions.` },
    ...messages,
  ]
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: history,
      tools: formattedTools,
      tool_choice: 'auto',
      stream: true,
      temperature,
    })
    
    let fullText = ''
    let toolCalls: any[] = []
    
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
            // Assign a stable fallback ID on first sight
            toolCalls[idx] = { id: `call_${idx}_${Date.now()}`, name: '', args: '' }
          }
          if (tc.id) toolCalls[idx].id = tc.id
          if (tc.function?.name) toolCalls[idx].name = tc.function.name
          if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments
        }
      }
    }
    
    // Filter sparse array slots
    const validToolCalls = toolCalls.filter(Boolean)
    if (validToolCalls.length === 0) break
    
    // ← empty string, never null
    history.push({
      role: 'assistant',
      content: fullText || '',
      tool_calls: validToolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args }
      }))
    })
    
    for (const tc of validToolCalls) {
      enqueue(`\n\n>**Calling tool:** \`${tc.name}\` with ${tc.args}`)
      
      try {
        const result = await executeTool(tc.name, JSON.parse(tc.args || '{}'))
        enqueue(`\n\n>**Tool result received**\n\n`)
        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        })
      } catch (e: any) {
        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: `Error: ${e.message}`,
        })
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, temperature = 0.7 } = await req.json()
    
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const enqueue = (text: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`))
        }
        
        try {
          await runAgentLoop(messages, temperature, enqueue)
        } catch (err: any) {
          console.error("Agent Loop Error:", err)
          enqueue(`\n\n**Error:** ${err.message || "Failed to generate response"}`)
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      },
    })
    
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}