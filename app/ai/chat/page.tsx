'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo, spacegrotesk } from '@/lib/font'
import {
  ArrowUp, Brain, ChevronRight, AlertCircle, Star,
  Copy, Check, Search, Database, Zap, Newspaper, Calendar,
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
  content: string
  toolCalls: ToolCall[]
  thinking?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const SUGGESTED = [
  { label: '🚨 Breaking news', prompt: 'What is the latest breaking news?' },
  { label: '📈 Trending now', prompt: 'Show me trending articles' },
  { label: '💻 Tech today', prompt: 'Latest technology news' },
  { label: '🌍 World events', prompt: 'What is happening in the world today?' },
]

// ─── Code Block ───────────────────────────────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-stone-200">
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
    <div className="relative my-4 rounded-xl overflow-hidden border border-stone-800 bg-stone-950">
      <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 border-b border-stone-800">
        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-200 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-relaxed font-mono text-stone-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Markdown Components ──────────────────────────────────────────────────────

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-stone-900 mt-5 mb-2 leading-tight tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-stone-800 mt-4 mb-2 tracking-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-stone-700 mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-stone-700 leading-[1.75] my-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-none pl-0 my-2 flex flex-col gap-1 text-sm text-stone-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 flex flex-col gap-1 text-sm text-stone-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed flex items-start gap-2 before:content-['–'] before:text-stone-400 before:mt-0.5 before:flex-shrink-0">
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-amber-400 pl-4 my-3 text-stone-500 italic text-sm bg-amber-50 py-2 pr-3 rounded-r-lg">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-stone-200">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-stone-50 text-stone-600">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-stone-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-stone-50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-2.5 text-stone-700">{children}</td>,
  hr: () => <hr className="my-5 border-stone-200" />,
  strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-stone-600">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors font-medium">
      {children}
    </a>
  ),
}

// ─── Think Block ──────────────────────────────────────────────────────────────

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-500 transition-colors group"
      >
        <Brain className="w-3 h-3 flex-shrink-0" />
        <span className="italic">thinking</span>
        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <p className="mt-2 pl-4 text-[11px] text-stone-400 italic leading-relaxed whitespace-pre-wrap border-l border-stone-200">
          {content}
        </p>
      )}
    </div>
  )
}

// ─── Tool Entry ───────────────────────────────────────────────────────────────

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
  } catch { /* ignore */ }

  return (
    <div>
      <button
        onClick={() => tc.preview && setExpanded((v) => !v)}
        className={[
          'flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-lg transition-colors',
          tc.preview ? 'hover:bg-stone-50 cursor-pointer' : 'cursor-default',
        ].join(' ')}
      >
        <span className="flex-shrink-0 w-3.5">
          {!tc.done ? (
            <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />
          ) : tc.success ? (
            <CheckCheck className="w-3 h-3 text-emerald-500" />
          ) : (
            <XCircle className="w-3 h-3 text-red-400" />
          )}
        </span>
        <span className={`flex-shrink-0 ${tc.done ? 'text-stone-400' : 'text-amber-500'}`}>
          <Icon className="w-3 h-3" />
        </span>
        <span className="text-[11px] text-stone-500 font-medium flex-shrink-0">{label}</span>
        {argsDisplay && (
          <>
            <span className="text-stone-300 text-[10px]">·</span>
            <span className="text-[11px] text-stone-400 truncate flex-1 max-w-[200px]">{argsDisplay}</span>
          </>
        )}
        {tc.preview && (
          <ChevronRight className={`w-3 h-3 text-stone-300 ml-auto flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        )}
      </button>
      {expanded && tc.preview && (
        <div className="ml-8 mt-0.5 mb-1 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100">
          <p className="text-[11px] text-stone-500 font-mono leading-relaxed line-clamp-4">{tc.preview}…</p>
        </div>
      )}
    </div>
  )
}

// ─── Tool Feed ────────────────────────────────────────────────────────────────

function ToolFeed({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [open, setOpen] = useState(true)
  if (toolCalls.length === 0) return null

  const doneCount = toolCalls.filter((t) => t.done).length
  const allDone = doneCount === toolCalls.length
  const label = allDone
    ? `${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''} used`
    : `Running tools… (${doneCount}/${toolCalls.length})`

  const byCategory = toolCalls.reduce<Record<string, ToolCall[]>>((acc, tc) => {
    ;(acc[tc.category] ??= []).push(tc)
    return acc
  }, {})

  return (
    <div className="my-3 rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-stone-50 transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
        <div className="flex items-center gap-1.5 flex-1">
          {!allDone && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
          <span className="text-[11px] text-stone-500 font-medium">{label}</span>
        </div>
        <div className="flex gap-1">
          {Object.keys(byCategory).map((cat) => {
            const CatIcon = CATEGORY_ICON[cat] ?? Zap
            return (
              <span key={cat} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-stone-100 text-[9px] text-stone-500 font-medium">
                <CatIcon className="w-2.5 h-2.5" />
                {cat}
              </span>
            )
          })}
        </div>
      </button>
      {open && (
        <div className="border-t border-stone-100 px-2 py-1.5">
          {toolCalls.map((tc) => (
            <ToolEntry key={tc.id} tc={tc} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Message Content ──────────────────────────────────────────────────────────

function MessageContent({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const { content, toolCalls, thinking } = message
  const showTyping = isStreaming && !content && toolCalls.length === 0 && !thinking

  return (
    <div className={`flex flex-col gap-1 min-w-full pt-1 ${spacegrotesk.className}`}>
      {thinking && <ThinkBlock content={thinking} />}
      <ToolFeed toolCalls={toolCalls} />
      {showTyping ? (
        <span className="flex items-center gap-2 text-stone-400 text-xs italic py-2">
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 gap-8">
      <div className="text-center space-y-2">
        <p className={`text-3xl font-semibold text-stone-800 tracking-tight ${slabo.className}`}>
          What would you like to know?
        </p>
        <p className="text-sm text-stone-400">
          Powered by semantic search · RAG · real-time news
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {SUGGESTED.map((s) => (
          <button
            key={s.prompt}
            onClick={() => onSubmit(s.prompt)}
            className="px-4 py-2 rounded-full bg-stone-50 border border-stone-200 text-sm text-stone-600 hover:bg-stone-100 hover:border-stone-300 transition-all active:scale-95 font-medium"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isLastAi, isLoading }: { message: Message; isLastAi: boolean; isLoading: boolean }) {
  const isUser = message.from === 'user'

  return (
    <div className={`flex min-w-full ${isUser ? 'justify-end' : 'justify-start'} animate-msg-in`}>
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end max-w-[85%]' : 'items-start w-full'}`}>
        {!isUser && (
          <div className="flex items-center justify-between w-full border-t border-stone-100 pt-3 mb-1">
            <div className="flex items-center gap-2">
              <PinwheelLoader size={28} isfill={true} isDone={!isLoading || !isLastAi} />
              <p className={`text-sm font-bold text-stone-800 tracking-tight ${slabo.className}`}>Parallaxa</p>
            </div>
            {message.toolCalls.length > 0 && (
              <span className="text-[10px] text-stone-400 bg-stone-50 border border-stone-100 px-2 py-0.5 rounded-full">
                {message.toolCalls.filter((t) => t.done).length}/{message.toolCalls.length} tools
              </span>
            )}
          </div>
        )}
        <div className={`text-sm ${isUser ? 'bg-stone-900 text-stone-50 px-4 py-2.5 rounded-2xl rounded-tr-sm whitespace-pre-wrap shadow-sm' : 'min-w-full'}`}>
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <MessageContent message={message} isStreaming={isLastAi && isLoading} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Input Bar ────────────────────────────────────────────────────────────────

function InputBar({
  query,
  setQuery,
  focused,
  setFocused,
  isLoading,
  inputRef,
  onSubmit,
  onKeyDown,
}: {
  query: string
  setQuery: (v: string) => void
  focused: boolean
  setFocused: (v: boolean) => void
  isLoading: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onSubmit: () => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="w-full pt-4 pb-6 px-4 flex flex-col items-center bg-white border-t border-stone-100">
      <div className="w-full max-w-xl space-y-2">
        <div className={[
          'flex flex-row items-center gap-2 bg-white rounded-2xl px-4 py-3 transition-all duration-200',
          focused ? 'shadow-lg ring-2 ring-stone-900/10 border border-stone-200' : 'shadow-md border border-stone-200',
        ].join(' ')}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything…"
            disabled={isLoading}
            className="flex-1 outline-none border-none bg-transparent text-sm text-stone-800 placeholder:text-stone-400 min-w-0 disabled:opacity-50"
          />
          <button
            onClick={onSubmit}
            disabled={!query.trim() || isLoading}
            className={[
              'rounded-xl p-2 flex items-center justify-center transition-all duration-150 flex-shrink-0',
              query.trim() && !isLoading
                ? 'bg-stone-900 text-white hover:bg-stone-700 active:scale-95 shadow-sm'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed',
            ].join(' ')}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin opacity-60" />
              : <ArrowUp className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-2">
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
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const { text, tools } = streamStateRef.current
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.from === 'ai') {
          next[next.length - 1] = { ...last, content: text, toolCalls: [...tools.values()] }
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

      setMessages((prev) => [...prev, { from: 'ai', content: '', toolCalls: [], thinking: undefined }])

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
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
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
        { from: 'ai', content: 'Sorry, I encountered an error. Please try again.', toolCalls: [] },
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
    <>
      <style>{`
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-msg-in { animation: msg-in 0.2s ease-out forwards; }
      `}</style>

      <div className="min-h-screen bg-stone-50 flex flex-col">
        <Header />

        <main className={`flex-1 flex flex-col items-center overflow-hidden ${slabo.className}`}>

          {/* Message area */}
          <div className="flex-1 w-full flex flex-col items-center overflow-y-auto">
            <div className="flex flex-col gap-0 w-full max-w-2xl px-4">

              {messages.length === 0 && (
                <EmptyState onSubmit={handleSubmit} />
              )}

              <div className="py-6 flex flex-col gap-6">
                {messages.map((m, index) => {
                  const isLastAi = m.from === 'ai' && index === messages.length - 1
                  return (
                    <MessageBubble
                      key={index}
                      message={m}
                      isLastAi={isLastAi}
                      isLoading={isLoading}
                    />
                  )
                })}
              </div>

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Input */}
          <InputBar
            query={query}
            setQuery={setQuery}
            focused={focused}
            setFocused={setFocused}
            isLoading={isLoading}
            inputRef={inputRef}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
          />
        </main>
      </div>
    </>
  )
}