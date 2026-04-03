'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo, spacegrotesk } from '@/lib/font'
import {
  ArrowRight, Brain, ChevronRight, AlertCircle, Info, CheckCircle,
  Copy, Check, Search, Database, Zap, Newspaper, Calendar, Star,
  TrendingUp, FileText, Layers, Loader2, CheckCheck, XCircle,
} from 'lucide-react'
import {
  useState, useRef, KeyboardEvent, useEffect, useCallback,
  ComponentPropsWithoutRef,
} from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolCall {
  id: string
  name: string
  icon: string
  category: string
  args: string
  done: boolean
  success?: boolean
  preview?: string
}

interface Message {
  from: 'ai' | 'user'
  content: string           // streamed text
  toolCalls: ToolCall[]
  thinking?: string
}

// ─── Tool category → icon map ─────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, React.ElementType> = {
  rag: Layers,
  search: Search,
  database: Database,
  news: Newspaper,
  utility: Zap,
}

const TOOL_ICON_MAP: Record<string, React.ElementType> = {
  semantic_search: Layers,
  search_articles: Search,
  get_articles_by_category: Newspaper,
  get_breaking_news: AlertCircle,
  get_featured_articles: Star,
  get_trending_articles: TrendingUp,
  get_article_by_slug: FileText,
  get_context_for_question: Brain,
  summarize_article: FileText,
  get_articles_by_date: Calendar,
}

const TOOL_LABEL: Record<string, string> = {
  semantic_search: 'Semantic search',
  search_articles: 'Keyword search',
  get_articles_by_category: 'Browse category',
  get_breaking_news: 'Breaking news',
  get_featured_articles: 'Featured articles',
  get_trending_articles: 'Trending articles',
  get_article_by_slug: 'Fetch article',
  get_context_for_question: 'RAG context',
  summarize_article: 'Summarise',
  get_articles_by_date: 'Articles by date',
}

// ─── Code block ───────────────────────────────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[0.82em] font-mono">
        {children}
      </code>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-950 text-gray-100">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Markdown component map ───────────────────────────────────────────────────

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-gray-900 mt-3 mb-1.5">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-800 leading-relaxed my-1.5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 flex flex-col gap-0.5 text-sm text-gray-800">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 flex flex-col gap-0.5 text-sm text-gray-800">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-300 pl-4 my-2 text-gray-600 italic text-sm bg-blue-50 py-2 rounded-r-md">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 text-gray-700">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-gray-800">{children}</td>,
  hr: () => <hr className="my-4 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors"
    >
      {children}
    </a>
  ),
}

// ─── Tool Feed ────────────────────────────────────────────────────────────────

function ToolEntry({ tc }: { tc: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICON_MAP[tc.name] ?? Zap
  const label = TOOL_LABEL[tc.name] ?? tc.name

  let argsDisplay = ''
  try {
    const parsed = JSON.parse(tc.args || '{}')
    argsDisplay = Object.values(parsed)
      .filter(Boolean)
      .map((v) => String(v))
      .join(' · ')
      .slice(0, 60)
  } catch {}

  return (
    <div className="group">
      <button
        onClick={() => tc.preview && setExpanded((v) => !v)}
        className={`flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md transition-colors
          ${tc.preview ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
      >
        {/* Status indicator */}
        <span className="flex-shrink-0">
          {!tc.done ? (
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          ) : tc.success ? (
            <CheckCheck className="w-3 h-3 text-emerald-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-400" />
          )}
        </span>

        {/* Tool icon */}
        <span className={`flex-shrink-0 ${tc.done ? 'text-gray-400' : 'text-amber-400'}`}>
          <Icon className="w-3 h-3" />
        </span>

        {/* Label + args */}
        <span className="text-[11px] text-gray-500 font-medium flex-shrink-0">{label}</span>
        {argsDisplay && (
          <>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[11px] text-gray-400 truncate flex-1 max-w-[200px]">
              {argsDisplay}
            </span>
          </>
        )}

        {/* Expand arrow */}
        {tc.preview && (
          <ChevronRight
            className={`w-3 h-3 text-gray-300 ml-auto flex-shrink-0 transition-transform
              ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>

      {/* Preview panel */}
      {expanded && tc.preview && (
        <div className="ml-7 mt-0.5 mb-1 px-2 py-1.5 bg-gray-50 rounded-md border border-gray-100">
          <p className="text-[11px] text-gray-500 font-mono leading-relaxed line-clamp-3">
            {tc.preview}…
          </p>
        </div>
      )}
    </div>
  )
}

function ToolFeed({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [open, setOpen] = useState(true)
  if (toolCalls.length === 0) return null

  const doneCount = toolCalls.filter((t) => t.done).length
  const allDone = doneCount === toolCalls.length
  const label = allDone
    ? `${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''} used`
    : `Running tools… (${doneCount}/${toolCalls.length})`

  // Group by category
  const byCategory = toolCalls.reduce<Record<string, ToolCall[]>>((acc, tc) => {
    ;(acc[tc.category] ??= []).push(tc)
    return acc
  }, {})

  return (
    <div className="my-2 rounded-lg border border-gray-100 bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0
            ${open ? 'rotate-90' : ''}`}
        />
        <div className="flex items-center gap-1.5 flex-1">
          {!allDone && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
          <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        </div>
        {/* Category pills */}
        <div className="flex gap-1">
          {Object.keys(byCategory).map((cat) => {
            const CatIcon = CATEGORY_ICON[cat] ?? Zap
            return (
              <span
                key={cat}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-[9px] text-gray-500 font-medium"
              >
                <CatIcon className="w-2.5 h-2.5" />
                {cat}
              </span>
            )
          })}
        </div>
      </button>

      {/* Tool entries */}
      {open && (
        <div className="border-t border-gray-50 px-2 py-1">
          {toolCalls.map((tc) => (
            <ToolEntry key={tc.id} tc={tc} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Message content ──────────────────────────────────────────────────────────

function MessageContent({
  message,
  isStreaming,
}: {
  message: Message
  isStreaming?: boolean
}) {
  const { content, toolCalls, thinking } = message

  const showTyping = isStreaming && !content && toolCalls.length === 0 && !thinking

  return (
    <div className={`flex flex-col gap-1 min-w-full pt-1 ${spacegrotesk.className}`}>
      {/* Thinking */}
      {thinking && <ThinkBlock content={thinking} />}

      {/* Tool feed */}
      <ToolFeed toolCalls={toolCalls} />

      {/* Main text */}
      {showTyping ? (
        <span className="flex items-center gap-1.5 text-gray-400 text-xs italic py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Thinking…
        </span>
      ) : content ? (
        <Markdown
          className="min-w-full"
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={mdComponents}
        >
          {content}
        </Markdown>
      ) : null}
    </div>
  )
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
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <p className="mt-1 pl-4 text-[11px] text-gray-400 italic leading-relaxed whitespace-pre-wrap border-l border-gray-200">
          {content}
        </p>
      )}
    </div>
  )
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED = [
  { label: '🚨 Breaking news', prompt: 'What is the latest breaking news?' },
  { label: '📈 Trending now', prompt: 'Show me trending articles' },
  { label: '💻 Tech today', prompt: 'Latest technology news' },
  { label: '🌍 World events', prompt: 'What is happening in the world today?' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const rafRef = useRef<number | null>(null)
  const streamStateRef = useRef<{ text: string; tools: Map<string, ToolCall> }>({
    text: '',
    tools: new Map(),
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  // Flush streamed state → React state (batched via rAF)
  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const { text, tools } = streamStateRef.current
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.from === 'ai') {
          next[next.length - 1] = {
            ...last,
            content: text,
            toolCalls: [...tools.values()],
          }
        }
        return next
      })
    })
  }, [])

  const handleSubmit = async (overrideQuery?: string) => {
    const trimmed = (overrideQuery ?? query).trim()
    if (!trimmed || isLoading) return

    const historySnapshot = messages.map((m) => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    setMessages((prev) => [...prev, { from: 'user', content: trimmed, toolCalls: [] }])
    setQuery('')
    setIsLoading(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Reset stream state
    streamStateRef.current = { text: '', tools: new Map() }

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [...historySnapshot, { role: 'user', content: trimmed }],
          temperature: 0.6,
        }),
      })

      if (!response.ok) throw new Error(`API error ${response.status}`)

      // Add empty AI message
      setMessages((prev) => [
        ...prev,
        { from: 'ai', content: '', toolCalls: [], thinking: undefined },
      ])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue

            try {
              const event = JSON.parse(data)

              if (event.type === 'text') {
                streamStateRef.current.text += event.content
                scheduleFlush()
              } else if (event.type === 'tool_start') {
                streamStateRef.current.tools.set(event.id, {
                  id: event.id,
                  name: event.name,
                  icon: event.icon,
                  category: event.category,
                  args: event.args ?? '',
                  done: false,
                })
                scheduleFlush()
              } else if (event.type === 'tool_result') {
                const existing = streamStateRef.current.tools.get(event.id)
                if (existing) {
                  streamStateRef.current.tools.set(event.id, {
                    ...existing,
                    done: true,
                    success: event.success,
                    preview: event.preview,
                  })
                  scheduleFlush()
                }
              } else if (event.type === 'error') {
                streamStateRef.current.text += `\n\n**Error:** ${event.content}`
                scheduleFlush()
              }

              // Legacy text-only events
              if (event.content && !event.type) {
                streamStateRef.current.text += event.content
                scheduleFlush()
              }
            } catch { /* skip malformed */ }
          }
        }

        // Final flush
        if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
        const { text, tools } = streamStateRef.current
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.from === 'ai') {
            next[next.length - 1] = { ...last, content: text, toolCalls: [...tools.values()] }
          }
          return next
        })
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          from: 'ai',
          content: 'Sorry, I encountered an error. Please try again.',
          toolCalls: [],
        },
      ])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className={`flex-1 flex flex-col items-center overflow-hidden bg-white ${slabo.className}`}>
        <div className="flex-1 w-full flex flex-col items-center overflow-y-auto px-4 py-10">
          <div className="flex flex-col gap-6 w-full max-w-2xl">

            {/* Empty state */}
            {messages.length === 0 && (
              <div className="py-16 flex flex-col items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-gray-800 mb-1">
                    What would you like to know?
                  </p>
                  <p className="text-sm text-gray-400">
                    Powered by semantic search · RAG · real-time news
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED.map((s) => (
                    <button
                      key={s.prompt}
                      onClick={() => handleSubmit(s.prompt)}
                      className="px-3.5 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm
                        text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-all
                        active:scale-95"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, index) => {
              const isLastAi = m.from === 'ai' && index === messages.length - 1
              return (
                <div
                  key={index}
                  className={`flex min-w-full ${m.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`flex flex-col gap-1 ${
                      m.from === 'user' ? 'items-end max-w-[85%]' : 'items-start w-full'
                    }`}
                  >
                    {/* Message header */}
                    {m.from === 'ai' && (
                      <div className="flex items-center justify-between w-full border-t border-gray-100 pt-3 mb-1">
                        <div className="flex items-center gap-2">
                          <PinwheelLoader size={30} isfill={true} isDone={!isLoading || !isLastAi} />
                          <p className="text-sm font-bold text-gray-800">Parallaxa</p>
                        </div>
                        {/* Tool count badge */}
                        {m.toolCalls.length > 0 && (
                          <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                            {m.toolCalls.filter((t) => t.done).length}/{m.toolCalls.length} tools
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={`text-sm ${
                        m.from === 'user'
                          ? 'bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-tr-sm whitespace-pre-wrap'
                          : 'min-w-full'
                      }`}
                    >
                      {m.from === 'ai' ? (
                        <MessageContent
                          message={m}
                          isStreaming={isLastAi && isLoading}
                        />
                      ) : (
                        <span>{m.content}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input bar */}
        <div className="w-full pt-4 pb-6 px-4 flex flex-col items-center bg-white border-t border-gray-100">
          <div className="w-full max-w-xl">
            <div
              className={`flex flex-row items-center gap-2 bg-white rounded-full px-5 py-3
                transition-all duration-200
                ${focused
                  ? 'shadow-lg ring-2 ring-gray-900/8'
                  : 'shadow-md border border-gray-200'}`}
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
                className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800
                  placeholder:text-gray-400 min-w-0 disabled:opacity-60"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!query.trim() || isLoading}
                className={`rounded-full p-2 flex items-center justify-center transition-all
                  duration-150 flex-shrink-0
                  ${query.trim() && !isLoading
                    ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 animate-spin opacity-60" />
                  : <ArrowRight className="w-4 h-4" />
                }
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-2.5 flex items-center justify-center gap-2">
              <span className="flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> RAG
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Search className="w-2.5 h-2.5" /> Semantic search
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Parallel tools
              </span>
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.22s ease-out forwards; }
      `}</style>
    </div>
  )
}