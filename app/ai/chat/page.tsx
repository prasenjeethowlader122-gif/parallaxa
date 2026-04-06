'use client'

import { Header } from '@/components/header'
import {
  ArrowRight,
  Brain,
  Copy,
  Check,
  Search,
  Globe,
  Share2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  TrendingUp,
  Star,
  Newspaper,
  Zap,
  BookOpen,
  AlignLeft,
  ExternalLink,
  Hash,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react'
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ComponentPropsWithoutRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const TOOL_ICONS: Record<string, React.ElementType> = {
  semantic_search: Search,
  search_articles: Hash,
  get_breaking_news: Zap,
  get_trending_articles: TrendingUp,
  get_featured_articles: Star,
  get_articles_by_category: BookOpen,
  get_article_by_slug: AlignLeft,
  get_context_for_question: Brain,
  summarize_article: AlignLeft,
}

const SUGGESTED_QUERIES = [
  { text: "What are today's top trending stories?", icon: TrendingUp },
  { text: 'Show me featured articles', icon: Star },
  { text: 'Latest breaking news', icon: Newspaper },
  { text: 'World news highlights', icon: Globe },
  { text: 'Summarize the top story', icon: Sparkles },
  { text: 'Explain a complex topic', icon: Lightbulb },
]

// ─── Markdown Components ────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className)
      return (
        <code className="bg-[#f0eded] text-[#1c1b1b] px-1.5 py-0.5 rounded font-mono text-[0.82em] font-medium border border-[#bccac2]">
          {children}
        </code>
      )
    return (
      <pre className="bg-[#1c1b1b] border border-[#3d4a44] rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-[#7ff8cf]">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-[#1c1b1b] mt-6 mb-3 leading-tight tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-[#1c1b1b] mt-5 mb-2 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[#3d4a44] mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-base text-[#3d4a44] leading-[1.8] mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-2 text-[#3d4a44] pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2 text-[#3d4a44]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-base leading-relaxed flex gap-2.5 items-start">
      <span className="mt-[10px] w-1.5 h-1.5 rounded-full bg-[#006950] shrink-0 block" />
      <span>{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#006950] hover:text-[#008466] underline underline-offset-2 decoration-[#61dbb4] font-medium transition-colors inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink className="w-3 h-3 inline-block opacity-60" />
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-[#006950] pl-4 my-4 text-[#6d7a73] italic bg-[#f0eded] py-2 pr-3 rounded-r-lg text-base">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#1c1b1b]">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-[#1c1b1b]">{children}</em>
  ),
  hr: () => <hr className="border-[#e5e2e1] my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-[#bccac2]">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left py-2.5 px-4 font-semibold text-[#3d4a44] bg-[#f0eded] border-b border-[#bccac2] text-xs uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-4 text-[#6d7a73] border-b border-[#f0eded] text-sm">{children}</td>
  ),
}

// ─── Tool Call Badge ─────────────────────────────────────────────────────────────

function ToolCallBadge({ tool }: { tool: ToolCall }) {
  const Icon = TOOL_ICONS[tool.name] ?? Search
  const label = TOOL_LABEL[tool.name] ?? tool.name

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
        tool.done
          ? tool.success === false
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-[#e8f5f0] border-[#bccac2] text-[#006950]'
          : 'bg-[#f0eded] border-[#e5e2e1] text-[#6d7a73] animate-pulse'
      }`}
    >
      {tool.done ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {label}
    </motion.div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────────

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<'up' | 'down' | null>(null)

  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (message.from === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[75%] bg-[#1c1b1b] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      {/* Tool calls row */}
      {message.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {message.toolCalls.map((tc) => (
            <ToolCallBadge key={tc.id} tool={tc} />
          ))}
        </div>
      )}

      {/* AI response */}
      <div className="bg-white rounded-2xl rounded-tl-sm border border-[#e5e2e1] px-5 py-4 shadow-sm">
        {message.content ? (
          <div className="prose prose-sm max-w-none">
            <Markdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={mdComponents}
            >
              {message.content}
            </Markdown>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[#bccac2]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006950] animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#006950] animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#006950] animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {/* Action row */}
      {message.content && (
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded] transition-all"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => setLiked(liked === 'up' ? null : 'up')}
            className={`p-1.5 rounded-lg text-xs transition-all ${liked === 'up' ? 'text-[#006950] bg-[#e8f5f0]' : 'text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded]'}`}
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => setLiked(liked === 'down' ? null : 'down')}
            className={`p-1.5 rounded-lg text-xs transition-all ${liked === 'down' ? 'text-red-500 bg-red-50' : 'text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded]'}`}
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
          <button className="p-1.5 rounded-lg text-xs text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded] transition-all">
            <Share2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ─── Suggested Query Chip ─────────────────────────────────────────────────────

function SuggestionChip({ text, icon: Icon, onClick }: { text: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#e5e2e1] bg-white hover:border-[#006950] hover:bg-[#f0faf6] text-sm text-[#3d4a44] transition-all text-left group"
    >
      <Icon className="w-3.5 h-3.5 text-[#006950] shrink-0" />
      <span className="line-clamp-1">{text}</span>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ParallaxaAi() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim()
    if (!userText || isLoading) return

    setQuery('')
    setIsLoading(true)

    // Add user message
    const userId = `u-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: userId, from: 'user', content: userText, toolCalls: [] },
    ])

    // Add empty AI placeholder
    const aiId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: aiId, from: 'ai', content: '', toolCalls: [] },
    ])

    // Build history for API
    const history = messages.map((m) => ({
      role: m.from === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: userText }],
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`API error ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break

          let event: Record<string, unknown>
          try { event = JSON.parse(raw) } catch { continue }

          const type = event.type as string

          if (type === 'tool_start') {
            const tool: ToolCall = {
              id: event.id as string,
              name: event.name as string,
              category: event.category as string ?? '',
              args: event.args as string ?? '',
              done: false,
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, toolCalls: [...m.toolCalls, tool] } : m
              )
            )
          } else if (type === 'tool_done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                      ...m,
                      toolCalls: m.toolCalls.map((tc) =>
                        tc.id === (event.id as string)
                          ? { ...tc, done: true, success: event.success as boolean, preview: event.preview as string }
                          : tc
                      ),
                    }
                  : m
              )
            )
          } else if (type === 'delta') {
            const chunk = event.content as string
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId ? { ...m, content: m.content + chunk } : m
              )
            )
          } else if (type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? { ...m, content: `⚠️ Error: ${event.message as string}` }
                  : m
              )
            )
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? { ...m, content: '⚠️ Something went wrong. Please try again.' }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(query)
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#f8f7f6] flex flex-col">
      <Header includeTicker={false} />

      {/* ── Message Thread ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <AnimatePresence>
            {!hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center pt-16 pb-8 gap-6"
              >
                {/* Hero */}
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#006950] flex items-center justify-center shadow-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#1c1b1b] tracking-tight">Parallaxa AI</h1>
                  <p className="text-sm text-[#6d7a73] max-w-xs leading-relaxed">
                    Your intelligent news assistant. Ask about trending stories, breaking news, or any topic.
                  </p>
                </div>

                {/* Suggestions */}
                <div className="w-full grid grid-cols-2 gap-2 mt-2">
                  {SUGGESTED_QUERIES.map(({ text, icon }) => (
                    <SuggestionChip
                      key={text}
                      text={text}
                      icon={icon}
                      onClick={() => sendMessage(text)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex flex-col gap-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onCopy={handleCopy} />
            ))}
          </div>
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* ── Input Bar ── */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#f8f7f6] via-[#f8f7f6] to-transparent pt-4 pb-6 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 bg-white border border-[#e5e2e1] rounded-2xl px-4 py-3 shadow-sm focus-within:border-[#006950] focus-within:ring-1 focus-within:ring-[#006950]/20 transition-all">
            <Brain className="w-4 h-4 text-[#6d7a73] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              className="flex-1 outline-none border-none bg-transparent text-sm text-[#1c1b1b] placeholder:text-[#bccac2]"
              placeholder="Ask about any news topic…"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(query)}
              disabled={!query.trim() || isLoading}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#006950] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#005240] transition-all shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-[#bccac2] mt-2">
            Powered by Parallaxa · AI can make mistakes
          </p>
        </div>
      </div>
    </main>
  )
}