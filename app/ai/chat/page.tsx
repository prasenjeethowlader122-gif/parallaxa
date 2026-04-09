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
  Menu,
  ChevronDown,
  Send,
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
  { text: "What's happening today?", icon: TrendingUp },
  { text: 'Featured stories', icon: Star },
  { text: 'Breaking news', icon: Newspaper },
  { text: 'World updates', icon: Globe },
  { text: 'Explain this...', icon: Lightbulb },
]

// ─── Markdown Components (Perplexity-style) ─────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className)
      return (
        <code className="bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded font-mono text-xs font-medium border border-gray-200">
          {children}
        </code>
      )
    return (
      <pre className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-green-400">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-gray-900 mt-8 mb-4 leading-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-3 leading-tight">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-xl font-semibold text-gray-900 mt-4 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-lg text-gray-700 leading-relaxed mb-6">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-6 space-y-3 text-gray-700 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-6 space-y-3 text-gray-700 pl-6">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-base leading-relaxed flex items-start gap-2">
      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:text-blue-800 underline decoration-blue-500 font-medium transition-colors inline-flex items-center gap-1"
    >
      {children}
      <ExternalLink className="w-3 h-3 opacity-70" />
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-500 pl-6 my-6 italic bg-blue-50 p-4 rounded-r-lg text-gray-700">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-gray-900">{children}</strong>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-gray-200">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left py-3 px-4 font-semibold text-gray-800 bg-gray-50 border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-3 px-4 text-gray-700 border-b border-gray-100">{children}</td>
  ),
}

// ─── Perplexity-style Tool Badge ────────────────────────────────────────────────

function ToolCallBadge({ tool }: { tool: ToolCall }) {
  const Icon = TOOL_ICONS[tool.name] ?? Search
  const label = TOOL_LABEL[tool.name] ?? tool.name
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        tool.done
          ? tool.success === false
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-gray-100 border-gray-200 text-gray-600 animate-pulse'
      }`}
    >
      {tool.done ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <Icon className="w-3 h-3 flex-shrink-0" />
      )}
      <span>{label}</span>
    </motion.div>
  )
}

// ─── Perplexity-style Message ───────────────────────────────────────────────────

function MessageBubble({ message, onCopy }: { message: Message; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  if (message.from === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end mb-8"
      >
        <div className="max-w-2xl bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm text-gray-900 text-base leading-relaxed">
          {message.content}
        </div>
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {message.toolCalls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.toolCalls.map((tc) => (
            <ToolCallBadge key={tc.id} tool={tc} />
          ))}
        </div>
      )}
      
      <div className="max-w-4xl bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
        <div className="prose prose-lg max-w-none">
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={mdComponents}
          >
            {message.content}
          </Markdown>
        </div>
      </div>
      
      {message.content && (
        <div className="flex items-center gap-3 pl-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all font-medium"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Perplexity-style Suggestion ────────────────────────────────────────────────

function SuggestionChip({ text, icon: Icon, onClick }: { text: string; icon: React.ElementType; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all text-left shadow-sm"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-base font-medium text-gray-900 leading-relaxed">{text}</span>
    </motion.button>
  )
}

// ─── Main Perplexity-style Component ────────────────────────────────────────────

export default function ParallaxaAi() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  
  const hasMessages = messages.length > 0
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }, [])
  
  const sendMessage = useCallback(async (text: string) => {
    // ... (keep your existing sendMessage logic exactly the same)
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
        const lines = buffer.split('\\n')
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
                m.id === aiId ?
                {
                  ...m,
                  toolCalls: m.toolCalls.map((tc) =>
                    tc.id === (event.id as string) ?
                    { ...tc, done: true, success: event.success as boolean, preview: event.preview as string } :
                    tc
                  ),
                } :
                m
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
                m.id === aiId ?
                { ...m, content: `⚠️ Error: ${event.message as string}` } :
                m
              )
            )
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ?
            { ...m, content: '⚠️ Something went wrong. Please try again.' } :
            m
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col">
      {/* Perplexity-style Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Parallaxa AI
              </h1>
              <p className="text-sm text-gray-500">The AI news engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all">
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMessages([])}
              className="px-6 py-2.5 bg-gradient-to-r from-gray-900 to-black text-white rounded-2xl font-medium text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-sm"
            >
              New Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <AnimatePresence>
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center text-center gap-12 py-24"
                >
                  <div className="space-y-4">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                      <Brain className="w-12 h-12 text-white" />
                    </div>
                    <div className="space-y-3">
                      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent">
                        Ask anything
                      </h1>
                      <p className="text-xl text-gray-600 max-w-md mx-auto leading-relaxed">
                        Get instant answers with sources. Your AI-powered research assistant.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {SUGGESTED_QUERIES.map(({ text, icon: Icon }, i) => (
                      <SuggestionChip
                        key={text}
                        text={text}
                        icon={Icon}
                        onClick={() => sendMessage(text)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-12">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onCopy={handleCopy} />
              ))}
            </div>
            <div ref={bottomRef} className="h-24" />
          </div>
        </div>
      </div>

      {/* Perplexity-style Input */}
      <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200 pt-6 pb-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50/50 border border-gray-200 rounded-3xl p-4 flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all backdrop-blur-sm">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              className="flex-1 bg-transparent outline-none text-lg placeholder:text-gray-500 font-medium text-gray-900"
              placeholder="Ask anything..."
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(query)}
              disabled={!query.trim() || isLoading}
              className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4 font-medium tracking-wide">
            Free research preview. Pro unlocks 300+ sources & file analysis.
          </p>
        </div>
      </div>
    </main>
  )
}