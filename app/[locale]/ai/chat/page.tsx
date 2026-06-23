'use client'

import {
  ArrowUp,
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
  ChevronRight,
  RotateCcw,
  Plus,
  Loader2,
  ChevronDown,
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

// ─── Types ──────────────────────────────────────────────────────────────────────

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
  { text: "What's happening today?", icon: TrendingUp },
  { text: 'Featured stories', icon: Star },
  { text: 'Breaking news', icon: Newspaper },
  { text: 'World updates', icon: Globe },
]

// ─── Markdown Components ─────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className)
      return (
        <code className="bg-neutral-100 text-neutral-800 px-1.5 py-0.5 rounded-md font-mono text-[0.82em] font-medium border border-neutral-200/80">
          {children}
        </code>
      )
    return (
      <pre className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-emerald-400">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-2xl font-semibold text-neutral-900 mt-6 mb-3 leading-tight tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-neutral-900 mt-5 mb-2.5 leading-tight tracking-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-neutral-900 mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] text-neutral-700 leading-[1.75] mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-1.5 text-neutral-700 pl-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-1.5 text-neutral-700 pl-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[15px] leading-relaxed flex items-start gap-2.5">
      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full mt-[9px] flex-shrink-0" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600 font-medium transition-colors inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink className="w-3 h-3 opacity-50 ml-0.5" />
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-neutral-300 pl-4 my-4 text-neutral-500 italic text-[15px]">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-neutral-900">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-neutral-200">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left py-2.5 px-4 font-medium text-neutral-700 bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-4 text-neutral-600 border-b border-neutral-100 text-sm">{children}</td>
  ),
}

// ─── Tool Step Row (Morphic-style) ───────────────────────────────────────────────

function ToolStepRow({ tool }: { tool: ToolCall }) {
  const Icon = TOOL_ICONS[tool.name] ?? Search
  const label = TOOL_LABEL[tool.name] ?? tool.name

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2.5 text-sm text-neutral-500"
    >
      {tool.done ? (
        <div className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
          <Check className="w-2.5 h-2.5 text-neutral-500" />
        </div>
      ) : (
        <Loader2 className="w-4 h-4 text-neutral-400 animate-spin flex-shrink-0" />
      )}
      <span className={tool.done ? 'text-neutral-400 line-through' : 'text-neutral-500'}>
        {label}
      </span>
      {!tool.done && (
        <span className="text-neutral-400 text-xs truncate max-w-[200px]">
          {tool.args}
        </span>
      )}
    </motion.div>
  )
}

// ─── Source Pill ─────────────────────────────────────────────────────────────────

function SourcePill({ index, label }: { index: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 text-xs font-medium border border-neutral-200/80 cursor-default select-none">
      <span className="w-3.5 h-3.5 rounded-sm bg-neutral-300 flex items-center justify-center text-[9px] font-bold text-neutral-600">
        {index}
      </span>
      <span className="max-w-[120px] truncate">{label}</span>
    </span>
  )
}

// ─── Message ─────────────────────────────────────────────────────────────────────

function MessageBlock({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const hasTools = message.toolCalls.length > 0

  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (message.from === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[70%] bg-neutral-900 text-neutral-100 rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-relaxed">
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Tool steps */}
      {hasTools && (
        <div className="space-y-1.5 pl-0.5">
          {message.toolCalls.map((tc) => (
            <ToolStepRow key={tc.id} tool={tc} />
          ))}
        </div>
      )}

      {/* Divider after tools */}
      {hasTools && message.content && (
        <div className="border-t border-neutral-100 pt-3" />
      )}

      {/* Main content */}
      {message.content && (
        <div className="prose-custom">
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={mdComponents}
          >
            {message.content}
          </Markdown>
        </div>
      )}

      {/* Action bar */}
      {message.content && (
        <div className="flex items-center gap-1 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all">
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all">
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all">
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ─── Suggestion Chip ─────────────────────────────────────────────────────────────

function SuggestionChip({ text, icon: Icon, onClick }: { text: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 transition-all text-sm text-neutral-600 font-medium shadow-sm"
    >
      <Icon className="w-3.5 h-3.5 text-neutral-400" />
      {text}
    </motion.button>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────────

export default function ExposerAi() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [query])

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const userText = text.trim()
    if (!userText || isLoading) return

    setQuery('')
    setIsLoading(true)

    const userId = `u-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: userId, from: 'user', content: userText, toolCalls: [] },
    ])

    const aiId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: aiId, from: 'ai', content: '', toolCalls: [] },
    ])

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
              category: (event.category as string) ?? '',
              args: (event.args as string) ?? '',
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
                  ? { ...m, content: `Error: ${event.message as string}` }
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
              ? { ...m, content: 'Something went wrong. Please try again.' }
              : m
          )
        )
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
      textareaRef.current?.focus()
    }
  }, [isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(query)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-neutral-900 rounded-md flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-neutral-800 tracking-tight">Bangladesh Hindu Union</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4">
          <AnimatePresence>
            {!hasMessages && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center text-center gap-8 py-32"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">
                    What's on your mind?
                  </h1>
                  <p className="text-neutral-500 text-base">
                    Ask anything. Get answers with sources.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
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

          {hasMessages && (
            <div className="py-8 space-y-10">
              {messages.map((msg) => (
                <MessageBlock key={msg.id} message={msg} onCopy={handleCopy} />
              ))}
              <div ref={bottomRef} className="h-32" />
            </div>
          )}

          {!hasMessages && <div ref={bottomRef} />}
        </div>
      </main>

      {/* Input area */}
      <div className="sticky bottom-0 z-40 bg-white border-t border-neutral-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className={`relative border rounded-2xl bg-white transition-all ${
            query ? 'border-neutral-300 shadow-md' : 'border-neutral-200 shadow-sm'
          }`}>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none bg-transparent outline-none text-[15px] text-neutral-900 placeholder:text-neutral-400 px-4 pt-3.5 pb-12 leading-relaxed max-h-[180px] overflow-y-auto"
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all">
                  <Paperclip className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all">
                  <Globe className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => sendMessage(query)}
                disabled={!query.trim() || isLoading}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  query.trim() && !isLoading
                    ? 'bg-neutral-900 text-white hover:bg-neutral-700 shadow-sm'
                    : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-neutral-400 mt-2">
            Bangladesh Hindu Union AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  )
}