'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo } from '@/lib/font'
import { ArrowRight, Brain, ChevronRight } from 'lucide-react'
import { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react'
import remarkGfm from 'remark-gfm'
import Markdown from 'react-markdown'

interface Message {
  from: 'ai' | 'user'
  content: string
}

// ─── Parse content into segments ─────────────────────────────────────────────

type Segment =
  | { type: 'text'; content: string }
  | { type: 'think'; content: string }
  | { type: 'tool_call'; tool: string; args: string }
  | { type: 'tool_result'; tool?: string; summary?: string }

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = []
  let remaining = raw

  while (remaining.length > 0) {
    const thinkStart = remaining.indexOf('<think>')
    const toolCallIdx = remaining.indexOf('\n\n>**Calling tool:**')
    const toolResultIdx = remaining.indexOf('\n\n>**Tool result received**')

    const candidates = [
      thinkStart !== -1 ? thinkStart : Infinity,
      toolCallIdx !== -1 ? toolCallIdx : Infinity,
      toolResultIdx !== -1 ? toolResultIdx : Infinity,
    ]
    const earliest = Math.min(...candidates)

    if (earliest === Infinity) {
      if (remaining.trim()) segments.push({ type: 'text', content: remaining })
      break
    }

    if (earliest > 0) {
      const before = remaining.slice(0, earliest)
      if (before.trim()) segments.push({ type: 'text', content: before })
    }

    if (earliest === thinkStart) {
      const thinkEnd = remaining.indexOf('</think>', thinkStart + 7)
      if (thinkEnd === -1) {
        const content = remaining.slice(thinkStart + 7)
        if (content) segments.push({ type: 'think', content })
        remaining = ''
      } else {
        const content = remaining.slice(thinkStart + 7, thinkEnd)
        segments.push({ type: 'think', content })
        remaining = remaining.slice(thinkEnd + 8)
      }
    } else if (earliest === toolCallIdx) {
      const lineEnd = remaining.indexOf('\n', toolCallIdx + 2)
      const line =
        lineEnd === -1
          ? remaining.slice(toolCallIdx + 2)
          : remaining.slice(toolCallIdx + 2, lineEnd)

     // Change this line in parseSegments:
    // UPDATE ONLY THIS PART in your parseSegments function:
    const toolMatch = line.match(/>\*\*Calling tool:\*\* `([^`]+)` with (.*)/)

      const tool = toolMatch?.[1] ?? 'unknown'
      const args = toolMatch?.[2] ?? ''
      segments.push({ type: 'tool_call', tool, args })
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd)
    } else {
      const lineEnd = remaining.indexOf('\n', toolResultIdx + 2)
      segments.push({ type: 'tool_result' })
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd)
    }
  }

  return segments
}

// ─── Group tool calls + results into pairs ────────────────────────────────────

interface ToolPair {
  tool: string
  args: string
  done: boolean
  summary: string
}

function groupToolPairs(segments: Segment[]): ToolPair[] {
  const pairs: ToolPair[] = []
  // Use a map to track tools by name since they might arrive out of order
  const callStack: Segment[] = []
  
  for (const seg of segments) {
    if (seg.type === 'tool_call') {
      pairs.push({
        tool: seg.tool,
        args: seg.args,
        done: false,
        summary: 'running…'
      })
    } else if (seg.type === 'tool_result') {
      // Find the first "not done" pair and mark it finished
      const pendingIdx = pairs.findIndex(p => !p.done)
      if (pendingIdx !== -1) {
        pairs[pendingIdx].done = true
        pairs[pendingIdx].summary = 'done'
      }
    }
  }
  return pairs
}

// ─── Think block ──────────────────────────────────────────────────────────────

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
      >
        <Brain className="w-3 h-3 flex-shrink-0" />
        <span className="italic">thinking</span>
        <ChevronRight
          className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <p className="mt-1 pl-4 text-[11px] text-gray-400 italic leading-relaxed whitespace-pre-wrap border-l border-gray-200">
          {content}
        </p>
      )}
    </div>
  )
}

// ─── Tool feed ────────────────────────────────────────────────────────────────

function ToolFeed({ pairs }: { pairs: ToolPair[] }) {
  const [open, setOpen] = useState(false)
  if (pairs.length === 0) return null

  const label = `${pairs.length} tool${pairs.length > 1 ? 's' : ''} used`

  return (
    <div className="my-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
      >
        <ChevronRight
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span>{label}</span>
      </button>

      {open && (
        <div className="mt-1 pl-4 flex flex-col gap-0.5">
          {pairs.map((p, i) => (
            <div
              key={i}
              className="flex items-baseline gap-0 text-[11px] whitespace-nowrap overflow-hidden"
            >
              <div className="text-gray-400 flex-shrink-0" h-5 w-2 bg-transparent border-l border-b rounded-lb-md></div>
              <span className="font-mono text-gray-500 flex-shrink-0">{p.tool}</span>
              <span className="text-gray-300 px-1.5 flex-shrink-0">·</span>
              <span className="font-mono text-gray-400 overflow-hidden text-ellipsis flex-1 min-w-0">
                {p.args}
              </span>
              <span className="text-gray-300 pl-2 flex-shrink-0">{p.done ? 'done' : 'running…'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Rendered message content ─────────────────────────────────────────────────

function MessageContent({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  if (!content) {
    return <span className="text-gray-400 italic text-xs">Typing…</span>
  }

  const segments = parseSegments(content)

  if (segments.length === 0) {
    return <span className="text-gray-400 italic text-xs">Typing…</span>
  }

  const toolPairs = groupToolPairs(segments)
  const hasTools = toolPairs.length > 0

  return (
    <div className="flex flex-col gap-1 min-w-full">
      {segments
        .filter((s) => s.type === 'think')
        .map((s, i) =>
          s.type === 'think' ? <ThinkBlock key={i} content={s.content} /> : null
        )}

      {hasTools && <ToolFeed pairs={toolPairs} />}

      {segments
        .filter((s) => s.type === 'text')
        .map((s, i) =>
          s.type === 'text' && s.content.trim() ? (
            <Markdown
              key={i}
              className="min-w-full flex-wrap prose prose-sm max-w-none"
              remarkPlugins={[remarkGfm]}
            >
              {s.content}
            </Markdown>
          ) : null
        )}

      {isStreaming && (
        <div className="mt-2">
          <PinwheelLoader size={30} />
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // FIX 1: Use a ref to track in-flight request — prevents double-submit
  const abortControllerRef = useRef<AbortController | null>(null)

  // FIX 2: Accumulate streamed content in a ref; only flush to state on a
  //         rAF tick so we don't call setMessages on every single SSE chunk.
  const streamBufferRef = useRef('')
  const rafRef = useRef<number | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Cancel any pending animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleSubmit = async () => {
    const trimmedQuery = query.trim()

    // FIX 3: Hard guard — don't fire while already loading
    if (!trimmedQuery || isLoading) return

    // Snapshot history BEFORE appending the new user message
    // so we don't accidentally include the empty AI placeholder in history
    const historySnapshot = messages.map((m) => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const userMsg: Message = { from: 'user', content: trimmedQuery }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)

    // FIX 4: Fresh AbortController per request so we can cancel cleanly
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            ...historySnapshot,
            { role: 'user', content: trimmedQuery },
          ],
          model: '@cf/moonshotai/kimi-k2.5',
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      // Add empty AI message once, then mutate via ref+rAF
      setMessages((prev) => [...prev, { from: 'ai', content: '' }])
      streamBufferRef.current = ''

      // FIX 5: Batch DOM updates — flush accumulated content on animation frames
      //         instead of calling setMessages for every SSE event
      const scheduleFlush = () => {
        if (rafRef.current !== null) return // already scheduled
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const buffered = streamBufferRef.current
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last?.from === 'ai') {
              next[next.length - 1] = { ...last, content: buffered }
            }
            return next
          })
        })
      }

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                streamBufferRef.current += parsed.content
                scheduleFlush()
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }

        // Final flush — ensure last chunk is written
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        const finalContent = streamBufferRef.current
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.from === 'ai') {
            next[next.length - 1] = { ...last, content: finalContent }
          }
          return next
        })
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return // user navigated away

      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          from: 'ai',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className={"flex-1 flex flex-col items-center overflow-hidden bg-white " + slabo.className}>
        {/* Messages */}
        <div className="flex-1 w-full flex flex-col items-center overflow-y-auto px-4 py-10">
          <div className="flex flex-col gap-6 w-full max-w-2xl">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-xl font-medium">How can I help you today?</p>
              </div>
            ) : (
              messages.map((m, index) => {
                const isLastAi = m.from === 'ai' && index === messages.length - 1
                return (
                  <div
                    key={index}
                    className={`flex min-w-full ${
                      m.from === 'user' ? 'justify-end' : 'justify-start'
                    } animate-fade-in`}
                  >
                    <div
                      className={`flex flex-col gap-1 max-w-[100%] text-md ${
                        m.from === 'user' ? 'items-end' : 'items-start w-full'
                      }`}
                    >
                      <div className="flex items-center text-[11px] px-1">
                        {m.from === 'user' ? (
                          <div className="w-6 h-6 rounded-full bg-gray-200" title="User" />
                        ) : (
                          <div className='flex items-center justify-start gap-2'><PinwheelLoader size= {35} isDone={!isLoading || !isLastAi}/><p className='font-bold'>{"Parallaxa"}</p></div>
                        )}
                      </div>

                      <div
                        className={`text-md text-gray-800 ${
                          m.from === 'user'
                            ? 'bg-gray-100 px-4 py-2.5 rounded-2xl rounded-tr-sm whitespace-pre-wrap'
                            : 'min-w-full'
                        }`}
                      >
                        {m.from === 'ai' ? (
                          <MessageContent
                            content={m.content}
                            isStreaming={isLastAi && isLoading}
                          />
                        ) : (
                          <span>{m.content}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input */}
        <div className="w-full pt-4 pb-6 px-4 flex flex-col items-center bg-white border-t border-transparent">
          <div className="w-full max-w-xl">
            <div
              className={`
                flex flex-row items-center gap-2 bg-white rounded-full
                px-5 py-3 transition-all duration-200
                ${
                  focused
                    ? 'shadow-lg ring-2 ring-gray-900/5'
                    : 'shadow-md border border-gray-200'
                }
              `}
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                disabled={isLoading}
                className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 min-w-0 disabled:opacity-60"
              />
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
                className={`
                  rounded-full p-2 flex items-center justify-center transition-all duration-150 flex-shrink-0
                  ${
                    query.trim() && !isLoading
                      ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <ArrowRight
                  className={`w-4 h-4 ${isLoading ? 'animate-spin opacity-50' : ''}`}
                />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              Powered by Cloudflare AI (Kimi K2.5) with streaming responses
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  )
}