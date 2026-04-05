'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo, spacegrotesk } from '@/lib/font'
import {
  ArrowRight,
  Brain,
  AlertCircle,
  Copy,
  Check,
  Search,
  Zap,
  Layers,
  Loader2,
  CheckCheck,
  Plus,
  Clock,
  Globe,
  Library,
  Share2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Paperclip,
  Mic,
  X,
  Hash,
  TrendingUp,
  Star,
  Newspaper,
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

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOOL_LABEL: Record<string, string> = {
  semantic_search: 'Semantic Search',
  search_articles: 'Keyword Search',
  get_articles_by_category: 'Categories',
  get_breaking_news: 'Breaking News',
  get_featured_articles: 'Featured',
  get_trending_articles: 'Trending',
  get_article_by_slug: 'Article',
  get_context_for_question: 'Knowledge Base',
  summarize_article: 'Summary',
}

const SUGGESTED_QUERIES = [
  { icon: TrendingUp, text: "What are today's top trending stories?" },
  { icon: Star, text: 'Show me featured articles' },
  { icon: Newspaper, text: 'Latest breaking news' },
  { icon: Globe, text: 'World news highlights' },
]

// ─── Markdown Components ────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className)
      return (
        <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-md font-mono text-[0.85em] font-medium">
          {children}
        </code>
      )
    return (
      <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-gray-300">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-xl font-medium text-gray-900 mt-6 mb-2 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-medium text-gray-800 mt-5 mb-2 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium text-gray-700 mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-700 leading-[1.8] mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 space-y-1.5 text-sm text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-3 space-y-1.5 text-sm text-gray-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed flex gap-2 items-start">
      <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0 block" />
      <span>{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-900 underline underline-offset-2 decoration-gray-400 hover:decoration-gray-700 font-medium transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-300 pl-4 my-4 text-gray-500 italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-medium text-gray-900">{children}</strong>
  ),
  hr: () => <hr className="border-gray-100 my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left py-2 px-3 font-medium text-gray-800 bg-gray-50 border-b border-gray-200 text-sm">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2 px-3 text-gray-600 border-b border-gray-100 text-sm">{children}</td>
  ),
}

// ─── Source Pills ────────────────────────────────────────────────────────────────

function SourcePills({ toolCalls, isLoading }: { toolCalls: ToolCall[]; isLoading: boolean }) {
  if (toolCalls.length === 0 && !isLoading) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-4">
      {toolCalls.map((tc) => (
        <span
          key={tc.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs text-gray-500 transition-colors"
        >
          {tc.done ? (
            tc.success !== false ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
            )
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse shrink-0" />
          )}
          {TOOL_LABEL[tc.name] || tc.name}
          {tc.preview && (
            <span className="text-gray-400 truncate max-w-[80px] italic">{tc.preview}</span>
          )}
        </span>
      ))}
      {isLoading && toolCalls.every((t) => t.done) && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-dashed border-gray-200 text-xs text-gray-400">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          Searching...
        </span>
      )}
    </div>
  )
}

// ─── Typing Indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ─── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isLastAi,
  isLoading,
}: {
  message: Message
  isLastAi: boolean
  isLoading: boolean
}) {
  const [copied, setCopied] = useState(false)
  const isUser = message.from === 'user'
  const isStreaming = isLastAi && isLoading && !message.content

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="w-full max-w-2xl mx-auto px-6 pt-10 pb-4">
        <h1 className="text-2xl font-medium text-gray-900 tracking-tight leading-snug">
          {message.content}
        </h1>
      </div>
    )
  }

  return (
    <div className="w-full border-b border-gray-100 pb-10">
      <div className="max-w-2xl mx-auto px-6 pt-4 space-y-4">

        {/* Sources */}
        <SourcePills toolCalls={message.toolCalls} isLoading={isLastAi && isLoading} />

        {/* Answer */}
        <div>
          {/* Label + actions */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <Check className="w-3 h-3" />
              Answer
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                title="Copy answer"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <Share2 className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div>
            {isStreaming ? (
              <TypingIndicator />
            ) : !message.content ? (
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-4/5 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-3/5 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse" />
              </div>
            ) : (
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={mdComponents}
              >
                {message.content}
              </Markdown>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Input Bar ──────────────────────────────────────────────────────────────────

function InputBar({
  query,
  setQuery,
  focused,
  setFocused,
  isLoading,
  inputRef,
  onSubmit,
  pill = false,
}: {
  query: string
  setQuery: (v: string) => void
  focused: boolean
  setFocused: (v: boolean) => void
  isLoading: boolean
  inputRef: React.RefObject<HTMLTextAreaElement>
  onSubmit: (q?: string) => void
  pill?: boolean
}) {
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  if (pill) {
    // Welcome screen: single-line pill matching /ai/page.tsx
    return (
      <div
        className={`flex flex-row items-center gap-2 bg-white rounded-full w-full px-5 py-2 transition-all duration-200 ${
          focused
            ? 'shadow-[0_0_0_2px_rgba(0,0,0,0.12)]'
            : 'shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-200'
        }`}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            autoResize(e.target)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSubmit()
            }
          }}
          placeholder="Ask anything…"
          className="flex-1 outline-none border-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 min-w-0 resize-none overflow-hidden leading-normal"
          style={{ fontFamily: 'inherit', paddingTop: '6px', paddingBottom: '6px' }}
        />
        <button
          onClick={() => onSubmit()}
          disabled={!query.trim() || isLoading}
          aria-label="Submit"
          className={`rounded-full p-2 flex items-center justify-center transition-all duration-150 shrink-0 ${
            query.trim() && !isLoading
              ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>
    )
  }

  // Thread input: slightly more functional, still minimal
  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border transition-all duration-200 ${
        focused
          ? 'border-gray-300 shadow-[0_0_0_3px_rgba(0,0,0,0.06)]'
          : 'border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-gray-300'
      }`}
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          autoResize(e.target)
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          }
        }}
        placeholder="Ask anything…"
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm outline-none text-gray-900 placeholder:text-gray-400 min-h-[48px] max-h-[160px] leading-relaxed"
        style={{ fontFamily: 'inherit' }}
      />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors">
            <Paperclip className="w-3 h-3" />
            Attach
          </button>
        </div>
        <button
          onClick={() => onSubmit()}
          disabled={!query.trim() || isLoading}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150 ${
            query.trim() && !isLoading
              ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Nav Item ───────────────────────────────────────────────────────────────────

function NavItem({
  icon: Icon,
  label,
  active,
  small,
  onClick,
}: {
  icon: any
  label: string
  active?: boolean
  small?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all select-none ${
        active
          ? 'bg-gray-100 text-gray-900 font-medium'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      <Icon className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span className={`${small ? 'text-xs' : 'text-sm'} truncate leading-none`}>{label}</span>
    </div>
  )
}

// ─── Welcome Screen ─────────────────────────────────────────────────────────────

function WelcomeScreen({
  query,
  setQuery,
  focused,
  setFocused,
  isLoading,
  inputRef,
  onSubmit,
}: any) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-xl space-y-8">

        {/* Logo + tagline — matches /ai/page.tsx exactly */}
        <div className="flex flex-col items-center gap-3">
          <PinwheelLoader size={120} isfill={true} isDone={true} />
          <p className="text-sm text-gray-400 tracking-wide">
            What would you like to explore?
          </p>
        </div>

        {/* Pill input */}
        <InputBar
          query={query}
          setQuery={setQuery}
          focused={focused}
          setFocused={setFocused}
          isLoading={isLoading}
          inputRef={inputRef}
          onSubmit={onSubmit}
          pill
        />

        {/* Suggestion chips — 2-column grid */}
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_QUERIES.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => onSubmit(text)}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all text-left text-xs text-gray-600 hover:text-gray-900"
            >
              <div className="p-1.5 rounded-lg bg-gray-50 shrink-0">
                <Icon className="w-3 h-3 text-gray-500" />
              </div>
              <span className="leading-snug font-medium">{text}</span>
            </button>
          ))}
        </div>

        {/* Disclaimer — matches /ai/page.tsx */}
        <div className="flex flex-wrap justify-center text-xs text-gray-400">
          We are using third-party llm models for this interface
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recentThreads, setRecentThreads] = useState<string[]>([
    'Market Analysis Q4...',
    'Next.js App Router...',
    'Breaking Tech News...',
  ])

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(
    async (overrideQuery?: string) => {
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

      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }

      const aiId = (Date.now() + 1).toString()
      const aiMessage: Message = {
        id: aiId,
        from: 'ai',
        content: '',
        toolCalls: [],
      }
      setMessages((prev) => [...prev, aiMessage])

      try {
        const prevMessages = [...messages, userMessage].map((m) => ({
          role: m.from === 'user' ? 'user' : 'assistant',
          content: m.content,
        }))

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: prevMessages }),
        })

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (raw === '[DONE]') break

            try {
              const event = JSON.parse(raw)

              if (event.type === 'text') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? { ...m, content: m.content + event.content } : m,
                  ),
                )
              } else if (event.type === 'tool_start') {
                const newTool: ToolCall = {
                  id: event.id,
                  name: event.name,
                  category: event.category ?? 'utility',
                  args: event.args ?? '',
                  done: false,
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? { ...m, toolCalls: [...m.toolCalls, newTool] } : m,
                  ),
                )
              } else if (event.type === 'tool_result') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId
                      ? {
                          ...m,
                          toolCalls: m.toolCalls.map((tc) =>
                            tc.id === event.id
                              ? { ...tc, done: true, success: event.success, preview: event.preview }
                              : tc,
                          ),
                        }
                      : m,
                  ),
                )
              } else if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId
                      ? { ...m, content: m.content || `⚠️ Error: ${event.content}` }
                      : m,
                  ),
                )
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (e: any) {
        console.error('[chat] Error:', e)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: `⚠️ Something went wrong. Please try again.\n\n_${e.message}_`,
                }
              : m,
          ),
        )
      } finally {
        setIsLoading(false)
        setRecentThreads((prev) => [
          trimmed.slice(0, 24) + (trimmed.length > 24 ? '...' : ''),
          ...prev.slice(0, 4),
        ])
      }
    },
    [query, isLoading, messages],
  )

  const lastAiId = [...messages].reverse().find((m) => m.from === 'ai')?.id

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans">

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-56 border-r border-gray-200 hidden lg:flex flex-col shrink-0 bg-white">

        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-100">
          <PinwheelLoader size={22} isfill={true} isDone={!isLoading} />
          <span className="font-medium text-base text-gray-900 tracking-tight">
            Parallaxa
          </span>
        </div>

        {/* New thread */}
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={() => setMessages([])}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all active:scale-[0.98]"
          >
            New thread
            <Plus className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-2 space-y-0.5 border-b border-gray-100">
          <NavItem icon={Search} label="Home" active />
          <NavItem icon={Globe} label="Discover" />
          <NavItem icon={Library} label="Library" />
        </nav>

        {/* Recents */}
        <div className="p-2 flex-1 min-h-0 overflow-y-auto">
          <p className="px-2 pb-2 pt-1 text-[10px] font-medium text-gray-400 uppercase tracking-widest">
            Recent
          </p>
          {recentThreads.map((t, i) => (
            <NavItem key={i} icon={Clock} label={t} small />
          ))}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">

        {/* Mobile header */}
        <header className="h-12 border-b border-gray-100 flex items-center justify-between px-4 lg:hidden bg-white shrink-0">
          <div className="flex items-center gap-2">
            <PinwheelLoader size={18} isfill={true} isDone={!isLoading} />
            <span className="font-medium text-sm">Parallaxa</span>
          </div>
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </header>

        {/* Messages / Welcome */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <WelcomeScreen
              query={query}
              setQuery={setQuery}
              focused={focused}
              setFocused={setFocused}
              isLoading={isLoading}
              inputRef={inputRef}
              onSubmit={handleSubmit}
            />
          ) : (
            <div className="flex flex-col w-full">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLastAi={m.id === lastAiId}
                  isLoading={isLoading}
                />
              ))}
              <div ref={messagesEndRef} className="h-48" />
            </div>
          )}
        </div>

        {/* Floating bottom input (thread mode only) */}
        {messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent pt-10 pb-4 px-4 pointer-events-auto">
              <div className="max-w-2xl mx-auto">
                <InputBar
                  query={query}
                  setQuery={setQuery}
                  focused={focused}
                  setFocused={setFocused}
                  isLoading={isLoading}
                  inputRef={inputRef}
                  onSubmit={handleSubmit}
                />
                <p className="text-center text-[10px] text-gray-400 mt-2">
                  Parallaxa may make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}