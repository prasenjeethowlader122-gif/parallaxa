import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '342bdd8fddcbe228eb8c1d289d73da5a'
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'cfut_HcLxCCwJqdOs7Ma6hBPHIusyjh13pTHzhLOKjj6H7630b643'
const MODEL = process.env.CLOUDFLARE_AI_MODEL || '@cf/moonshotai/kimi-k2.5'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    if (!ACCOUNT_ID || !API_TOKEN) {
      return NextResponse.json(
        { error: 'Cloudflare credentials not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { messages, model = MODEL, temperature = 0.7 } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Validate messages format
    const validMessages: Message[] = messages.map((msg: any) => ({
      role: msg.role || 'user',
      content: msg.content || '',
    }))

    if (validMessages.length === 0) {
      return NextResponse.json(
        { error: 'At least one message is required' },
        { status: 400 }
      )
    }

    // Call Cloudflare AI API with streaming
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    try {
      const response = await fetch(cfUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: validMessages,
          stream: true,
          temperature,
          max_tokens: 1024,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.text()
        console.error('Cloudflare API error:', error)
        return NextResponse.json(
          { error: `Cloudflare AI API error: ${response.statusText}` },
          { status: response.status }
        )
      }

      // Handle streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
              controller.error(new Error('No response body'))
              return
            }

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value, { stream: true })
              const lines = chunk.split('\n')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim()

                  if (data === '[DONE]') {
                    controller.enqueue(
                      new TextEncoder().encode('data: [DONE]\n\n')
                    )
                    continue
                  }

                  if (data) {
                    try {
                      const parsed = JSON.parse(data)
                      
                      // Handle different streaming response formats
                      let content = ''
                      
                      if (parsed.choices?.[0]?.delta?.content) {
                        // OpenAI-compatible format
                        content = parsed.choices[0].delta.content
                      } else if (parsed.response) {
                        // Direct response format
                        content = parsed.response
                      } else if (typeof parsed === 'string') {
                        content = parsed
                      }

                      if (content) {
                        controller.enqueue(
                          new TextEncoder().encode(
                            `data: ${JSON.stringify({ content })}\n\n`
                          )
                        )
                      }
                    } catch (e) {
                      console.error('Parse error:', e)
                    }
                  }
                }
              }
            }

            controller.close()
          } catch (error) {
            console.error('Stream error:', error)
            controller.error(error)
          }
        },
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Transfer-Encoding': 'chunked',
        },
      })
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  } catch (error) {
    console.error('AI API Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}