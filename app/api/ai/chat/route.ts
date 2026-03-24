import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TOOLS } from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/executors'

// Configuration - Move these to .env in production!
const API_TOKEN = 'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'
const MODEL = process.env.CLOUDFLARE_AI_MODEL ?? 'gemini-2.0-flash'

const openai = new OpenAI({
  apiKey: API_TOKEN,
  baseURL: BASE_URL,
})

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const toolList = TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')
  return `You are Parallaxa.ai, an intelligent news-management assistant. Today is ${new Date().toUTCString()}.

You have access to the following tools. When you need to use a tool emit ONLY this XML:
<tool_call>{"name":"<tool_name>","arguments":{<json_args>}}</tool_call>

Available tools:
${toolList}

Rules:
1. Use tools for news searches, reading, or pipeline actions.
2. Respond in Markdown. 
3. NEVER show raw <tool_call> tags to the user.
4. Confirm destructive actions (run_news_pipeline) first.`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseToolCalls(text: string) {
  const pattern = /<tool_call>([\s\S]*?)<\/tool_call>/g
  const calls = []
  let m
  while ((m = pattern.exec(text)) !== null) {
    try {
      const obj = JSON.parse(m[1])
      calls.push({ name: obj.name, args: obj.arguments ?? obj.args ?? {} })
    } catch { /* skip */ }
  }
  return calls
}

// ─── Agent Loop ───────────────────────────────────────────────────────────────

async function runAgentLoop(
  messages: Message[],
  temperature: number,
  enqueue: (chunk: string) => void
) {
  const MAX_ITERATIONS = 6
  const history: any[] = [{ role: 'system', content: buildSystemPrompt() }, ...messages]
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: history,
      temperature,
      stream: true,
    })
    
    let fullText = ''
    let buffer = ''
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (!content) continue
      
      fullText += content
      buffer += content
      
      // Streaming logic: Avoid leaking <tool_call> tags to the UI
      const tagStart = buffer.indexOf('<tool_call>')
      if (tagStart === -1) {
        // No tag found: send everything except the last 11 chars (length of "<tool_call>")
        // to prevent flickering if a tag is just about to start.
        if (buffer.length > 11) {
          enqueue(buffer.slice(0, -11))
          buffer = buffer.slice(-11)
        }
      } else if (tagStart > 0) {
        // Tag found: send everything before the tag and clear it from buffer
        enqueue(buffer.slice(0, tagStart))
        buffer = buffer.slice(tagStart)
      }
    }
    
    // Flush remaining non-XML text
    const finalDisplay = buffer.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').replace(/<tool_call>[\s\S]*$/, '')
    if (finalDisplay) enqueue(finalDisplay)
    
    const toolCalls = parseToolCalls(fullText)
    if (toolCalls.length === 0) break
    
    history.push({ role: 'assistant', content: fullText })
    
    for (const tc of toolCalls) {
      enqueue(`\n\n>**Calling tool:** \`${tc.name}\`...`)
      const result = await executeTool(tc.name, tc.args)
      enqueue(`\n\n>**Tool result received**\n\n`)
      
      history.push({
        role: 'user',
        content: `[Tool result for ${tc.name}]:\n${result}`,
      })
    }
  }
}

// ─── Main Route ───────────────────────────────────────────────────────────────

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
          enqueue(`\n\n**Error:** ${err.message}`)
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