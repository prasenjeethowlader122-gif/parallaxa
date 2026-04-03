'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import { slabo, spacegrotesk } from '@/lib/font'
import {
  ArrowUp,
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

const TOOL_ICON: Record<string, string> = {
  semantic_search: '🔍',
  search_articles: '📰',
  get_articles_by_category: '🗂️',
  get_breaking_news: '🚨',
  get_featured_articles: '⭐',
  get_trending_articles: '📈',
  get_article_by_slug: '📄',
  get_context_for_question: '🧠',
  summarize_article: '✂️',
}

const SUGGESTED_QUERIES = [
  { icon: TrendingUp, text: 'What are today\'s top trending stories?' },
  { icon: Star, text: 'Show me featured articles' },
  { icon: Newspaper, text: 'Latest breaking news' },
  { icon: Globe, text: 'World news highlights' },
]

// ─── Markdown Components ────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className)
      return (
        <code className="bg-[#F0F4FF] text-[#3B5BDB] px-1.5 py-0.5 rounded-md font-mono text-[0.85em] font-medium">
          {children}
        </code>
      )
    return (
      <pre className="bg-[#0F1117] border border-white/10 rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-gray-300 shadow-xl">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-3 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-700 mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] text-gray-700 leading-[1.75] mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-2 text-[15px] text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2 text-[15px] text-gray-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed flex gap-2 items-start">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#3B5BDB] shrink-0 block" />
      <span>{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#3B5BDB] hover:text-[#2F4AC8] underline underline-offset-2 decoration-[#3B5BDB]/30 hover:decoration-[#3B5BDB] font-medium transition-colors"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#3B5BDB]/30 pl-4 my-4 text-gray-500 italic">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  hr: () => <hr className="border-gray-100 my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left py-2.5 px-3 font-semibold text-gray-900 bg-gray-50 border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">{children}</td>
  ),
}

// ─── Source Card ────────────────────────────────────────────────────────────────

function SourceCard({ tc, index }: { tc: ToolCall; index: number }) {
  const icon = TOOL_ICON[tc.name] || '🔧'
  const label = TOOL_LABEL[tc.name] || tc.name

  return (
    <div className="group relative flex flex-col gap-2 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#3B5BDB]/20 hover:bg-[#F0F4FF]/30 transition-all cursor-pointer shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            {index + 1}
          </span>
        </div>
        {tc.done ? (
          tc.success !== false ? (
            <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-600" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-red-500" />
            </div>
          )
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-[#3B5BDB] animate-spin" />
        )}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{label}</p>
        {tc.preview && (
          <p className="text-[10px] text-gray-400 truncate mt-0.5 italic leading-snug">
            {tc.preview}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Tool Progress Bar ──────────────────────────────────────────────────────────

function ToolProgress({ toolCalls, isLoading }: { toolCalls: ToolCall[]; isLoading: boolean }) {
  const [collapsed, setCollapsed] = useState(false)

  if (toolCalls.length === 0 && !isLoading) return null

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-900 transition-colors group"
      >
        <div className="p-1 rounded-lg bg-[#EEF2FF]">
          <Layers className="w-3.5 h-3.5 text-[#3B5BDB]" />
        </div>
        <span>Sources</span>
        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
          {toolCalls.length}
        </span>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto group-hover:text-gray-600" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto group-hover:text-gray-600" />
        )}
      </button>

      {!collapsed && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {toolCalls.map((tc, i) => (
            <SourceCard key={tc.id} tc={tc} index={i} />
          ))}
          {isLoading && toolCalls.every((t) => t.done) && (
            <div className="flex items-center justify-center p-3 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 animate-pulse">
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                <span className="text-[10px] text-gray-300">Searching...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Typing Indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#3B5BDB]/40 animate-bounce"
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
      <div className="w-full max-w-3xl mx-auto px-6 pt-10 pb-6">
        <h1
          className={`text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight leading-snug ${slabo.className}`}
        >
          {message.content}
        </h1>
      </div>
    )
  }

  return (
    <div className="w-full border-b border-gray-100/80 pb-12">
      <div className="max-w-3xl mx-auto px-6 space-y-6 pt-2">
        
        {/* Thinking indicator */}
        {message.thinking && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
            <Brain className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-xs text-amber-700 italic">
              Analyzing context and sources...
            </span>
          </div>
        )}

        {/* Sources */}
        <ToolProgress toolCalls={message.toolCalls} isLoading={isLastAi && isLoading} />

        {/* Answer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <div className="p-1 rounded-lg bg-emerald-50">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              Answer
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                title="Copy answer"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className={`${spacegrotesk.className}`}>
            {isStreaming ? (
              <TypingIndicator />
            ) : !message.content ? (
              <div className="space-y-2.5">
                <div className="h-3.5 bg-gray-100 rounded-full w-4/5 animate-pulse" />
                <div className="h-3.5 bg-gray-100 rounded-full w-3/5 animate-pulse" />
                <div className="h-3.5 bg-gray-100 rounded-full w-2/3 animate-pulse" />
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
}: {
  query: string
  setQuery: (v: string) => void
  focused: boolean
  setFocused: (v: boolean) => void
  isLoading: boolean
  inputRef: React.RefObject<HTMLTextAreaElement>
  onSubmit: (q?: string) => void
}) {
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  return (
    <div
      className={`relative flex flex-col w-full bg-white border-2 transition-all duration-200 rounded-2xl shadow-lg ${
        focused
          ? 'border-[#3B5BDB]/30 shadow-[#3B5BDB]/10 shadow-xl'
          : 'border-gray-200/80 hover:border-gray-300'
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
        placeholder="Ask anything..."
        className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[15px] outline-none text-gray-900 placeholder:text-gray-400 min-h-[52px] max-h-[200px] leading-relaxed"
        style={{ fontFamily: 'inherit' }}
      />

      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Zap className="w-3.5 h-3.5 text-[#3B5BDB]" />
            <span>Focus</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attach</span>
          </button>
        </div>

        <button
          onClick={() => onSubmit()}
          disabled={!query.trim() || isLoading}
          className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
            query.trim() && !isLoading
              ? 'bg-[#3B5BDB] text-white hover:bg-[#2F4AC8] shadow-md shadow-[#3B5BDB]/30 scale-100 hover:scale-105 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" />
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
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all select-none ${
        active
          ? 'bg-[#EEF2FF] text-[#3B5BDB] font-semibold'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      <Icon className={small ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
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
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className={`text-4xl md:text-5xl font-semibold text-gray-900 leading-tight tracking-tight ${slabo.className}`}>
            Where knowledge begins.
          </h2>
          <p className="text-gray-500 text-base">
            Ask anything. Search everything.
          </p>
        </div>

        {/* Input */}
        <InputBar
          query={query}
          setQuery={setQuery}
          focused={focused}
          setFocused={setFocused}
          isLoading={isLoading}
          inputRef={inputRef}
          onSubmit={onSubmit}
        />

        {/* Suggested queries */}
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_QUERIES.map(({ icon: Icon, text }) => (
            <button
              key={text}
              onClick={() => onSubmit(text)}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#3B5BDB]/30 hover:bg-[#EEF2FF]/30 transition-all text-left text-sm text-gray-600 hover:text-gray-900 shadow-sm hover:shadow group"
            >
              <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-[#EEF2FF] transition-colors">
                <Icon className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#3B5BDB]" />
              </div>
              <span className="leading-snug text-xs font-medium">{text}</span>
            </button>
          ))}
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

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus on load
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

      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }

      // Build AI message
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
                    m.id === aiId
                      ? { ...m, toolCalls: [...m.toolCalls, newTool] }
                      : m,
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
                              ? {
                                  ...tc,
                                  done: true,
                                  success: event.success,
                                  preview: event.preview,
                                }
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
                      ? {
                          ...m,
                          content:
                            m.content ||
                            `⚠️ Error: ${event.content}`,
                        }
                      : m,
                  ),
                )
              }
            } catch {
              // Ignore parse errors
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
        // Add to recent threads
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
    <div
      className="flex h-screen bg-[#FAFAFA] text-gray-900 overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-60 border-r border-gray-100 hidden lg:flex flex-col shrink-0 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
          <PinwheelLoader size={26} isfill={true} isDone={!isLoading} />
          <span className={`font-bold text-lg tracking-tight text-gray-900 ${slabo.className}`}>
            Parallaxa
          </span>
        </div>

        {/* New thread */}
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={() => setMessages([])}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 border border-gray-200 transition-all hover:border-gray-300 active:scale-[0.98]"
          >
            New Thread
            <div className="p-0.5 rounded-md bg-gray-100">
              <Plus className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </button>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-0.5 border-b border-gray-100">
          <NavItem icon={Search} label="Home" active />
          <NavItem icon={Globe} label="Discover" />
          <NavItem icon={Library} label="Library" />
        </nav>

        {/* Recents */}
        <div className="p-3 flex-1 min-h-0 overflow-y-auto">
          <p className="px-2 pb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Recent
          </p>
          {recentThreads.map((t, i) => (
            <NavItem key={i} icon={Clock} label={t} small />
          ))}
        </div>

        {/* Pro banner */}
        <div className="p-3 border-t border-gray-100">
          <div className="p-3 bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-xl border border-[#C7D2FE]">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#3B5BDB]" />
              <span className="text-[11px] font-bold text-[#3B5BDB]">PRO PLAN</span>
            </div>
            <p className="text-[10px] text-[#6674CC] mb-2 leading-snug">
              Unlock advanced models & unlimited queries
            </p>
            <button className="w-full py-1.5 bg-[#3B5BDB] text-white text-xs font-bold rounded-lg hover:bg-[#2F4AC8] transition-colors">
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Mobile header */}
        <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 lg:hidden bg-white shrink-0">
          <div className="flex items-center gap-2">
            <PinwheelLoader size={22} isfill={true} isDone={!isLoading} />
            <span className={`font-bold text-base ${slabo.className}`}>Parallaxa</span>
          </div>
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
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

        {/* Floating bottom input (only in thread) */}
        {messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent pt-12 pb-5 px-4 pointer-events-auto">
              <div className="max-w-3xl mx-auto">
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