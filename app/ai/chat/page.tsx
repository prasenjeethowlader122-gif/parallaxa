'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo, spacegrotesk } from '@/lib/font'
import {
  ArrowUpRight,
  Brain,
  ChevronRight,
  AlertCircle,
  Star,
  Copy,
  Check,
  Search,
  Database,
  Zap,
  Newspaper,
  Calendar,
  TrendingUp,
  FileText,
  Layers,
  Loader2,
  CheckCheck,
  XCircle,
} from 'lucide-react'
import {
  useState,
  useRef,
  KeyboardEvent,
  useEffect,
  useCallback,
  ComponentPropsWithoutRef,
} from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ToolCall {
  id: string
  name: string
  icon?: string
  category: string
  args: string
  done: boolean
  success?: boolean
  preview?: string
}

interface Message {
  id: string
  from: 'ai' | 'user'
  content: string
  toolCalls: ToolCall[]
  thinking?: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

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
  const lang = className?.replace(/^language-/, '')?.toLowerCase() ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (!className) {
    return (
      <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[0.82em] font-mono border border-gray-300">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[13px] leading-relaxed font-mono text-gray-800">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Markdown Components ───────────────────────────────────────────────────────

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mt-6 mb-2 tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold text-gray-800 mt-5 mb-2 tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 mt-3 mb-1">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed my-2">{children}</p>,
  ul: ({ children }) => <ul className="my-2 space-y-1 text-sm text-gray-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 text-sm text-gray-700">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-500 pl-4 my-3 text-gray-600 italic bg-blue-50 py-1.5 rounded-r-lg">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 text-gray-600">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-gray-50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-gray-700">{children}</td>,
  hr: () => <hr className="my-4 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors font-medium"
    >
      {children}
    </a>
  ),
}

// ─── Think Block ───────────────────────────────────────────────────────────────

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-500 transition-colors group"
      >
        <Brain className="w-3 h-3" />
        <span className="italic">thinking</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <p className="mt-2 pl-4 text-[11px] text-gray-400 italic leading-relaxed whitespace-pre-wrap border-l border-gray-200">
          {content}
        </p>
      )}
    </div>
  )
}

// ─── Tool Entry ────────────────────────────────────────────────────────────────

function ToolEntry({ tc }: { tc: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICON_MAP[tc.name] ?? Zap
  const label = TOOL_LABEL[tc.name] ?? tc.name

  let argsDisplay = ''
  try {
    const parsed = JSON.parse(tc.args)
    argsDisplay = Object.entries(parsed)
      .map(([k, v]) => `${k}=${v}`)
      .join(' · ')
      .slice(0, 70)
  } catch {
    argsDisplay = tc.args.slice(0, 70)
  }

  return (
    <div>
      <button
        onClick={() => tc.preview && setExpanded((v) => !v)}
        className={`flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg transition-colors hover:bg-gray-50 ${!tc.preview && 'cursor-default'}`}
      >
        <span className="flex-shrink-0 w-4">
          {!tc.done ? (
            <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
          ) : tc.success ? (
            <CheckCheck className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          )}
        </span>
        <Icon className={`w-3.5 h-3.5 ${tc.done ? 'text-gray-400' : 'text-orange-500'}`} />
        <span className="text-[11px] text-gray-600 font-medium truncate flex-1">{label}</span>

        {argsDisplay && (
          <>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[11px] text-gray-500 truncate">{argsDisplay}</span>
          </>
        )}

        {tc.preview && (
          <ChevronRight
            className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>

      {expanded && tc.preview && (
        <div className="ml-8 mt-1 mb-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[11px] text-gray-600 font-mono leading-relaxed">{tc.preview}</p>
        </div>
      )}
    </div>
  )
}

// ─── Tool Feed ─────────────────────────────────────────────────────────────────

function ToolFeed({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [open, setOpen] = useState(true)
  if (toolCalls.length === 0) return null

  const doneCount = toolCalls.filter((t) => t.done).length
  const allDone = doneCount === toolCalls.length

  const byCategory = toolCalls.reduce<Record<string, ToolCall[]>>((acc, tc) => {
    ;(acc[tc.category] ??= []).push(tc)
    return acc
  }, {})

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        <div className="flex items-center gap-1.5 flex-1">
          {!allDone && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
          <span className="text-[11px] text-gray-600 font-medium">
            {allDone
              ? `${toolCalls.length} tool${toolCalls.length > 1 ? 's' : ''} used`
              : `Running tools… (${doneCount}/${toolCalls.length})`}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-2 py-1.5 space-y-0.5">
          {toolCalls.map((tc) => (
            <ToolEntry key={tc.id} tc={tc} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Message Content ───────────────────────────────────────────────────────────

function MessageContent({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const { content, toolCalls, thinking } = message
  const showTyping = isStreaming && !content && toolCalls.length === 0 && !thinking

  return (
    <div className={`flex flex-col gap-1 ${spacegrotesk.className}`}>
      {thinking && <ThinkBlock content={thinking} />}
      <ToolFeed toolCalls={toolCalls} />
      {showTyping ? (
        <span className="flex items-center gap-1.5 text-gray-500 text-sm italic py-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Thinking…
        </span>
      ) : content ? (
        <Markdown
          className="min-w-full text-gray-700"
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

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 gap-6">
      <div className="text-center space-y-2">
        <p className={`text-2xl font-semibold text-gray-800 tracking-tight ${slabo.className}`}>
          Ask anything
        </p>
        <p className="text-sm text-gray-500">Semantic search · RAG · Real-time news</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {SUGGESTED.map((s) => (
          <button
            key={s.prompt}
            onClick={() => onSubmit(s.prompt)}
            className="px-3.5 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

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

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      const { text, tools } = streamStateRef.current
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.from === 'ai') {
          next[next.length - 1] = {
            ...last,
            content: text,
            toolCalls: Array.from(tools.values()),
          }
        }
        return next
      })
      rafRef.current = null
    })
  }, [])

  const handleStreamEvent = (event: any) => {
    if (event.type === 'text') {
      streamStateRef.current.text += event.content
      scheduleFlush()
    } else if (event.type === 'thinking') {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.from === 'ai') {
          next[next.length - 1] = { ...last, thinking: event.content }
        }
        return next
      })
    } else if (event.type === 'tool_start') {
      streamStateRef.current.tools.set(event.id, {
        id: event.id,
        name: event.name,
        category: event.category,
        args: event.args ?? '{}',
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
  }

  const handleSubmit = async (overrideQuery?: string) => {
    const trimmed = (overrideQuery ?? query).trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      from: 'user',
      content: trimmed,
      toolCalls: [],
    }

    setMessages((prev) => [...prev, userMessage])
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
          messages: messages.concat(userMessage).map((m) => ({
            role: m.from,
            content: m.content,
          })),
          temperature: 0.6,
        }),
      })

      if (!response.ok) throw new Error(`API error ${response.status}`)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        content: '',
        toolCalls: [],
        thinking: undefined,
      }

      setMessages((prev) => [...prev, aiMessage])

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine === '[DONE]') continue
          if (!trimmedLine.startsWith('data: ')) continue

          const dataStr = trimmedLine.slice(6).trim()
          if (!dataStr || dataStr === '[DONE]') continue

          try {
            const event = JSON.parse(dataStr)
            handleStreamEvent(event)
          } catch (e) {
            console.debug('Failed to parse event:', dataStr)
          }
        }
      }

      // Final flush
      const { text, tools } = streamStateRef.current
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.from === 'ai') {
          next[next.length - 1] = {
            ...last,
            content: text,
            toolCalls: Array.from(tools.values()),
          }
        }
        return next
      })
    } catch (error: any) {
      if (error.name === 'AbortError') return

      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
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

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />

        <main className={`flex-1 flex flex-col items-center overflow-hidden ${slabo.className}`}>
          <div className="flex-1 w-full flex flex-col items-center overflow-y-auto">
            <div className="flex flex-col gap-0 w-full max-w-3xl px-4 pb-2">
              {messages.length === 0 && <EmptyState onSubmit={handleSubmit} />}

              <div className="py-5 flex flex-col gap-6">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLastAi={message.from === 'ai' && message.id === messages[messages.length - 1]?.id}
                    isLoading={isLoading}
                  />
                ))}
              </div>

              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

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

// ─── Message Bubble Component (Extracted) ─────────────────────────────────────

function MessageBubble({
  message,
  isLastAi,
  isLoading,
}: {
  message: Message
  isLastAi: boolean
  isLoading: boolean
}) {
  const isUser = message.from === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-msg-in`}>
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end max-w-[85%]' : 'items-start w-full'}`}>
        {!isUser && (
          <div className="flex items-center justify-between w-full mb-1">
            <div className="flex items-center gap-2">
              <PinwheelLoader size={24} isfill={true} isDone={!isLoading || !isLastAi} />
              <p className={`text-sm font-bold text-gray-800 tracking-tight ${slabo.className}`}>
                Parallaxa
              </p>
            </div>
            {message.toolCalls.length > 0 && (
              <span className="text-[10px] text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                {message.toolCalls.filter((t) => t.done).length}/{message.toolCalls.length}
              </span>
            )}
          </div>
        )}

        <div
          className={`text-sm leading-relaxed ${
            isUser
              ? 'bg-gray-900 text-gray-50 px-3 py-2.5 rounded-2xl rounded-tr-sm break-words'
              : 'min-w-full'
          }`}
        >
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

// ─── Input Bar ─────────────────────────────────────────────────────────────────

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
    <div className="w-full pt-3 pb-5 px-4 flex flex-col items-center bg-white border-t border-gray-100">
      <div className="w-full max-w-xl space-y-2">
        <div
          className={`flex flex-row items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-sm border transition-all duration-200 ${
            focused ? 'border-gray-400 shadow-md' : 'border-gray-200'
          }`}
        >
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
            className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 min-w-0 disabled:opacity-50"
          />
          <button
            onClick={onSubmit}
            disabled={!query.trim() || isLoading}
            className={`rounded-xl p-2 flex items-center justify-center transition-all duration-150 flex-shrink-0 ${
              query.trim() && !isLoading
                ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin opacity-60" /> : <ArrowUpRight className="w-4 h-4" />}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-2">
          <span className="flex items-center gap-0.5"><Layers className="w-2.5 h-2.5" /> RAG</span>
          <span>·</span>
          <span className="flex items-center gap-0.5"><Search className="w-2.5 h-2.5" /> Semantic</span>
          <span>·</span>
          <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> Parallel tools</span>
        </p>
      </div>
    </div>
  )
}