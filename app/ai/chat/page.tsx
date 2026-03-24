'use client'

import { Header } from '@/components/header'
import { ArrowRight, ChevronDown, ChevronUp, Wrench, CheckCircle2, Brain } from 'lucide-react'
import { useState, useRef, KeyboardEvent } from 'react'
import remarkGfm from 'remark-gfm'
import Markdown from 'react-markdown'

interface Message {
  from: 'ai' | 'user'
  content: string
}

// ─── Parse content into segments ─────────────────────────────────────────────

type Segment = |
  { type: 'text';content: string } |
  { type: 'think';content: string } |
  { type: 'tool_call';tool: string;args: string } |
  { type: 'tool_result' }

function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = []
  
  // We process in order: <think>...</think>, tool-call markers, then plain text
  // Tool call marker format (from route.ts):
  //   > 🔧 **Calling tool:** `tool_name` with {...}
  //   > ✅ **Tool result received**
  
  let remaining = raw
  
  while (remaining.length > 0) {
    // 1. <think>...</think>
    const thinkStart = remaining.indexOf('<think>')
    const toolCallIdx = remaining.indexOf('\n\n>**Calling tool:**')
    const toolResultIdx = remaining.indexOf('\n\n>**Tool result received**')
    
    // Find the earliest special marker
    const candidates = [
      thinkStart !== -1 ? thinkStart : Infinity,
      toolCallIdx !== -1 ? toolCallIdx : Infinity,
      toolResultIdx !== -1 ? toolResultIdx : Infinity,
    ]
    const earliest = Math.min(...candidates)
    
    if (earliest === Infinity) {
      // No more special markers
      if (remaining.trim()) segments.push({ type: 'text', content: remaining })
      break
    }
    
    // Push text before the marker
    if (earliest > 0) {
      const before = remaining.slice(0, earliest)
      if (before.trim()) segments.push({ type: 'text', content: before })
    }
    
    if (earliest === thinkStart) {
      const thinkEnd = remaining.indexOf('</think>', thinkStart + 7)
      if (thinkEnd === -1) {
        // Unclosed think — treat rest as thinking (still streaming)
        const content = remaining.slice(thinkStart + 7)
        if (content) segments.push({ type: 'think', content })
        remaining = ''
      } else {
        const content = remaining.slice(thinkStart + 7, thinkEnd)
        segments.push({ type: 'think', content })
        remaining = remaining.slice(thinkEnd + 8)
      }
    } else if (earliest === toolCallIdx) {
      // Extract the tool call line
      const lineEnd = remaining.indexOf('\n', toolCallIdx + 2)
      const line = lineEnd === -1 ?
        remaining.slice(toolCallIdx + 2) :
        remaining.slice(toolCallIdx + 2, lineEnd)
      
      // Parse: > 🔧 **Calling tool:** `tool_name` with {...}
      const toolMatch = line.match(/\*\*Calling tool:\*\* `([^`]+)` with (.+)/)
      const tool = toolMatch?.[1] ?? 'unknown'
      const args = toolMatch?.[2] ?? ''
      segments.push({ type: 'tool_call', tool, args })
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd)
    } else {
      // tool_result
      const lineEnd = remaining.indexOf('\n', toolResultIdx + 2)
      segments.push({ type: 'tool_result' })
      remaining = lineEnd === -1 ? '' : remaining.slice(lineEnd)
    }
  }
  
  return segments
}

// ─── Think block component ────────────────────────────────────────────────────

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="font-medium italic">Thinking…</span>
        <span className="ml-auto">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-xs text-gray-400 italic border-t border-gray-200 pt-2 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
      )}
    </div>
  )
}

// ─── Tool call badge ──────────────────────────────────────────────────────────

function ToolCallBadge({ tool, args }: { tool: string;args: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2 rounded-full px-3 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Wrench className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
        <span className="font-medium">Calling tool:</span>
        <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">{tool}</code>
        <span className="ml-auto">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-blue-100 pt-2">
          <pre className="text-xs text-blue-500 font-mono whitespace-pre-wrap break-all">{args}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Tool result badge ────────────────────────────────────────────────────────

function ToolResultBadge() {
  return (
    <div className="my-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-green-100 bg-green-50 text-xs text-green-600">
      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="font-medium">Tool result received</span>
    </div>
  )
}

// ─── Rendered message content ─────────────────────────────────────────────────

function MessageContent({ content, isStreaming }: { content: string;isStreaming ? : boolean }) {
  if (!content) {
    return <span className="text-gray-400 italic">Typing…</span>
  }
  
  const segments = parseSegments(content)
  
  if (segments.length === 0) {
    return <span className="text-gray-400 italic">Typing…</span>
  }
  
  return (
    <div className="flex flex-col gap-1">
      {segments.map((seg, i) => {
        if (seg.type === 'think') {
          return <ThinkBlock key={i} content={seg.content} />
        }
        if (seg.type === 'tool_call') {
          return <ToolCallBadge key={i} tool={seg.tool} args={seg.args} />
        }
        if (seg.type === 'tool_result') {
          return <ToolResultBadge key={i} />
        }
        // text
        return seg.content.trim() ? (
          <Markdown key={i} className="w-full overflow-x-scroll" remarkPlugins={[remarkGfm]}>
            {seg.content}
          </Markdown>
        ) : null
      })}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse rounded-sm ml-0.5 align-middle" />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState < Message[] > ([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef < HTMLInputElement > (null)
  const messagesEndRef = useRef < HTMLDivElement > (null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const handleSubmit = async () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery || isLoading) return
    
    const userMsg: Message = { from: 'user', content: trimmedQuery }
    setMessages((prev) => [...prev, userMsg])
    setQuery('')
    setIsLoading(true)
    
    try {
      const conversationHistory = messages.map((m) => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: 'user', content: trimmedQuery },
          ],
          model: '@cf/moonshotai/kimi-k2.5',
          temperature: 0.7,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiContent = ''
      
      // Add empty AI message placeholder
      setMessages((prev) => [...prev, { from: 'ai', content: '' }])
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  aiContent += parsed.content
                  
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    if (newMessages[newMessages.length - 1].from === 'ai') {
                      newMessages[newMessages.length - 1].content = aiContent
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // Skip parse errors
              }
            }
          }
        }
      }
    } catch (error) {
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
      scrollToBottom()
      inputRef.current?.focus()
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent < HTMLInputElement > ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center overflow-hidden bg-white">

        {/* Messages Container - scrollable */}
        <div className="flex-1 w-full flex flex-col items-center px-4 py-10">
          <div className="flex flex-col gap-4 w-full max-w-2xl">
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
                    className={`flex w-full ${m.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div className={`flex flex-col items-start justify-center gap-3 max-w-[80%] ${m.from === 'user' ? 'flex-roe-reverse' : 'flex-col'}`}>
                      <small className="italic text-gray-600 rounded-full bg-gray-50 p-2 px-3">
                        {m.from === 'user' ? 'You' : 'Parallaxa.ai'}
                      </small>
                      <div className={`px-3 border-l border-gray-700 rounded-2xl text-sm ${
                        m.from === 'user' ? 'text-gray-800' : 'text-gray-800'
                      }`}>
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
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - fixed at bottom */}
        <div className="w-full pt-4 pb-6 px-4 flex flex-col items-center">
          <div className="w-full max-w-xl">
            <div
              className={`
                flex flex-row items-center gap-2 bg-white rounded-full 
                px-5 py-3 transition-all duration-200
                ${focused
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
                  ${query.trim() && !isLoading
                    ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <ArrowRight className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}