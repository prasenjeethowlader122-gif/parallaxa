import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TOOLS } from '@/lib/tools/definitions'
import { executeTool } from '@/lib/tools/executors'

const openai = new OpenAI({
  apiKey: 'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
})

/**
 * Maps your existing TOOLS to the OpenAI Function format.
 * Gemini 2.0/2.5 Flash strictly follows JSON Schema for parameters.
 */
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
  // Use 'system' role as usual; Gemini maps this correctly
  const history: any[] = [
    { role: 'system', content: `You are Parallaxa.ai. Use tools for news management.` },
    ...messages,
  ]
  
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await openai.chat.completions.create({
      model: process.env.CLOUDFLARE_AI_MODEL ?? 'gemini-2.0-flash',
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
      
      // 1. Regular text content
      if (delta?.content) {
        fullText += delta.content
        enqueue(delta.content)
      }
      
      // 2. Handle streaming tool calls
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          // Gemini compatibility fix: default to index 0 if missing
          const idx = tc.index ?? 0
          
          if (!toolCalls[idx]) {
            toolCalls[idx] = { id: tc.id, name: '', args: '' }
          }
          if (tc.id) toolCalls[idx].id = tc.id
          if (tc.function?.name) toolCalls[idx].name = tc.function.name
          if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments
        }
      }
    }
    
    // Exit loop if the model just provided a text response
    if (toolCalls.length === 0) break
    
    // IMPORTANT: Add the assistant's call to history before the tool result
    const assistantMsg = {
      role: 'assistant',
      content: fullText || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.args }
      }))
    }
    history.push(assistantMsg)
    
    // 3. Execute the tools
    for (const tc of toolCalls) {
      enqueue(`\n\n>**Calling tool:** \`${tc.name}\`...`)
      
      try {
        const args = JSON.parse(tc.args || '{}')
        const result = await executeTool(tc.name, args)
        
        enqueue(`\n\n>**Tool result received**\n\n`)
        
        // Use role: 'tool' for the response
        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        })
      } catch (e) {
        history.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: `Error: ${e instanceof Error ? e.message : 'Tool execution failed'}`,
        })
      }
    }
    // The loop repeats, feeding the tool results back to Gemini for the final summary
  }
}

export async function POST(req: NextRequest) {
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
}