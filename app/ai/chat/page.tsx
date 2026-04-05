'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import {
  ArrowUp,
  Brain,
  Copy,
  Check,
  Search,
  Loader2,
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
  ChevronRight,
  RotateCcw,
  AlignLeft,
  ExternalLink,
  Hash,
  Clock,
  Lightbulb,
} from 'lucide-react'
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  ComponentPropsWithoutRef,
} from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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
  { icon: TrendingUp, text: "What are today's top trending stories?", color: 'text-orange-500', bg: 'bg-orange-50' },
  { icon: Star, text: 'Show me featured articles', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { icon: Newspaper, text: 'Latest breaking news', color: 'text-red-500', bg: 'bg-red-50' },
  { icon: Globe, text: 'World news highlights', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Sparkles, text: 'Summarize the top story', color: 'text-purple-500', bg: 'bg-purple-50' },
  { icon: Lightbulb, text: 'Explain a complex topic', color: 'text-green-500', bg: 'bg-green-50' },
]

// ─── Animation Variants ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
}

const slideIn = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
}

// ─── Markdown Components ────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className)
      return (
        <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md font-mono text-[0.82em] font-medium border border-zinc-200">
          {children}
        </code>
      )
    return (
      <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-x-auto my-4 text-xs font-mono text-zinc-300">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-zinc-900 mt-6 mb-2 leading-tight tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-zinc-800 mt-5 mb-2 leading-snug">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-zinc-700 mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[15px] text-zinc-700 leading-[1.85] mb-3.5">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3.5 space-y-2 text-[15px] text-zinc-700 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-3.5 space-y-2 text-[15px] text-zinc-700">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed flex gap-2.5 items-start">
      <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 block" />
      <span>{children}</span>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-600 hover:text-teal-700 underline underline-offset-2 decoration-teal-300 hover:decoration-teal-500 font-medium transition-colors inline-flex items-center gap-0.5"
    >
      {children}
      <ExternalLink className="w-3 h-3 inline-block opacity-60" />
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-[3px] border-teal-400 pl-4 my-4 text-zinc-500 italic bg-teal-50/40 py-2 pr-3 rounded-r-lg">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-900">{children}</strong>
  ),
  hr: () => <hr className="border-zinc-100 my-6" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left py-2.5 px-4 font-semibold text-zinc-700 bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-4 text-zinc-600 border-b border-zinc-100 text-sm">{children}</td>
  ),
}

// ─── Source Pills ────────────────────────────────────────────────────────────────

function SourcePills({ toolCalls, isLoading }: { toolCalls: ToolCall[]; isLoading: boolean }) {
  if (toolCalls.length === 0 && !isLoading) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-1.5 mb-5"
    >
      {toolCalls.map((tc, i) => {
        const Icon = TOOL_ICONS[tc.name] || Search
        return (
          <motion.span
            key={tc.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-zinc-200 text-xs text-zinc-500 shadow-sm"
          >
            {tc.done ? (
              tc.success !== false ? (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              )
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0" />
            )}
            <Icon className="w-3 h-3 shrink-0" />
            <span className="font-medium">{TOOL_LABEL[tc.name] || tc.name}</span>
            {tc.preview && (
              <span className="text-zinc-400 truncate max-w-[70px] italic">{tc.preview}</span>
            )}
          </motion.span>
        )
      })}
      {isLoading && toolCalls.every((t) => t.done) && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-dashed border-teal-300 text-xs text-teal-600 shadow-sm"
        >
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span className="font-medium">Analyzing…</span>
        </motion.span>
      )}
    </motion.div>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3 py-2"
    >
      {[80, 65, 72, 55, 68].map((w, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className="h-3.5 bg-gradient-to-r from-zinc-100 via-zinc-50 to-zinc-100 rounded-full animate-pulse"
          style={{ width: `${w}%` }}
        />
      ))}
    </motion.div>
  )
}

// ─── Typing Indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
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
  index,
}: {
  message: Message
  isLastAi: boolean
  isLoading: boolean
  index: number
}) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null)
  const isUser = message.from === 'user'
  const isStreaming = isLastAi && isLoading && !message.content

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl mx-auto px-6 pt-10 pb-2"
      >
        <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight leading-snug">
          {message.content}
        </h1>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full border-b border-zinc-100 pb-10"
    >
      <div className="max-w-2xl mx-auto px-6 pt-6 space-y-4">

        {/* Sources */}
        <SourcePills toolCalls={message.toolCalls} isLoading={isLastAi && isLoading} />

        {/* Answer Block */}
        <div className="space-y-3">
          {/* Label row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-teal-500" />
              Answer
            </div>
            <div className="flex items-center gap-0.5">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
                title="Copy"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                      <Check className="w-3.5 h-3.5 text-teal-500" />
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                      <Copy className="w-3.5 h-3.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setLiked(liked === 'up' ? null : 'up')}
                className={`p-1.5 rounded-lg transition-all ${liked === 'up' ? 'text-teal-600 bg-teal-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setLiked(liked === 'down' ? null : 'down')}
                className={`p-1.5 rounded-lg transition-all ${liked === 'down' ? 'text-red-500 bg-red-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-100" />

          {/* Content */}
          <div className="pt-1">
            {isStreaming ? (
              <TypingIndicator />
            ) : !message.content ? (
              <SkeletonLoader />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={mdComponents}
                >
                  {message.content}
                </Markdown>
              </motion.div>
            )}
          </div>
        </div>

        {/* Follow-up suggestions (last AI only, done) */}
        {isLastAi && !isLoading && message.content && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="pt-4 flex flex-wrap gap-2"
          >
            {['Tell me more', 'Summarize in bullets', 'Find related articles'].map((s) => (
              <button
                key={s}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 text-xs text-zinc-500 font-medium transition-all shadow-sm"
              >
                <ChevronRight className="w-3 h-3" />
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
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
    return (
      <motion.div
        animate={{
          boxShadow: focused
            ? '0 0 0 2px rgba(20,184,166,0.3), 0 4px 24px rgba(0,0,0,0.08)'
            : '0 1px 6px rgba(0,0,0,0.07)',
          borderColor: focused ? 'rgba(20,184,166,0.4)' : 'rgba(228,228,231,1)',
        }}
        transition={{ duration: 0.2 }}
        className="flex flex-row items-center gap-2 bg-white rounded-2xl w-full px-5 py-3 border"
      >
        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
        <textarea
          ref={inputRef}
          rows={1}
          value={query}
          onChange={(e) => { setQuery(e.target.value); autoResize(e.target) }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
          placeholder="Ask anything…"
          className="flex-1 outline-none border-none bg-transparent text-sm text-zinc-800 placeholder:text-zinc-400 min-w-0 resize-none overflow-hidden leading-normal"
          style={{ fontFamily: 'inherit', paddingTop: '2px', paddingBottom: '2px' }}
        />
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onSubmit()}
          disabled={!query.trim() || isLoading}
          aria-label="Submit"
          className={`rounded-xl p-2 flex items-center justify-center transition-all duration-150 shrink-0 ${
            query.trim() && !isLoading
              ? 'bg-teal-600 text-white hover:bg-teal-500'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
        </motion.button>
      </motion.div>
    )
  }

  return (
    <motion.div
      animate={{
        boxShadow: focused
          ? '0 0 0 2px rgba(20,184,166,0.25), 0 8px 32px rgba(0,0,0,0.08)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        borderColor: focused ? 'rgba(20,184,166,0.35)' : 'rgba(228,228,231,1)',
      }}
      transition={{ duration: 0.2 }}
      className="flex flex-col bg-white rounded-2xl border"
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={query}
        onChange={(e) => { setQuery(e.target.value); autoResize(e.target) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }}
        placeholder="Ask a follow-up…"
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm outline-none text-zinc-900 placeholder:text-zinc-400 min-h-[52px] max-h-[160px] leading-relaxed"
        style={{ fontFamily: 'inherit' }}
      />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-lg transition-colors font-medium">
            <Paperclip className="w-3 h-3" />
            Attach
          </button>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-lg transition-colors font-medium">
            <Globe className="w-3 h-3" />
            Search web
          </button>
        </div>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSubmit()}
          disabled={!query.trim() || isLoading}
          className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 ${
            query.trim() && !isLoading
              ? 'bg-teal-600 text-white hover:bg-teal-500'
              : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5" />}
        </motion.button>
      </div>
    </motion.div>
  )
}

// ─── Welcome Screen ─────────────────────────────────────────────────────────────

function WelcomeScreen({
  query, setQuery, focused, setFocused, isLoading, inputRef, onSubmit,
}: any) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-teal-50/60 blur-3xl" />
        <div className="absolute top-2/3 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-50/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl space-y-8">
        {/* Logo + tagline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <PinwheelLoader size={72} isfill={true} isDone={true} />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">What would you like to explore?</h1>
            <p className="text-sm text-zinc-400">Powered by AI · Search · Summarize · Discover</p>
          </div>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <InputBar
            query={query} setQuery={setQuery} focused={focused} setFocused={setFocused}
            isLoading={isLoading} inputRef={inputRef} onSubmit={onSubmit} pill
          />
        </motion.div>

        {/* Suggestion grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-2 gap-2"
        >
          {SUGGESTED_QUERIES.map(({ icon: Icon, text, color, bg }, i) => (
            <motion.button
              key={text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSubmit(text)}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md transition-all text-left text-sm text-zinc-600 hover:text-zinc-900 group shadow-sm"
            >
              <div className={`p-2 rounded-lg ${bg} shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
              <span className="leading-snug font-medium text-xs">{text}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-zinc-400"
        >
          Powered by third-party AI models · Always verify important information
        </motion.p>
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

      if (inputRef.current) inputRef.current.style.height = 'auto'

      const aiId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, { id: aiId, from: 'ai', content: '', toolCalls: [] }])

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

        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

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
                  prev.map((m) => m.id === aiId ? { ...m, content: m.content + event.content } : m)
                )
              } else if (event.type === 'tool_start') {
                const newTool: ToolCall = {
                  id: event.id, name: event.name, category: event.category ?? 'utility',
                  args: event.args ?? '', done: false,
                }
                setMessages((prev) =>
                  prev.map((m) => m.id === aiId ? { ...m, toolCalls: [...m.toolCalls, newTool] } : m)
                )
              } else if (event.type === 'tool_result') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? {
                      ...m,
                      toolCalls: m.toolCalls.map((tc) =>
                        tc.id === event.id ? { ...tc, done: true, success: event.success, preview: event.preview } : tc
                      ),
                    } : m
                  )
                )
              } else if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? { ...m, content: m.content || `⚠️ ${event.content}` } : m
                  )
                )
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } catch (e: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: `⚠️ Something went wrong.\n\n_${e.message}_` } : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [query, isLoading, messages],
  )

  const lastAiId = [...messages].reverse().find((m) => m.from === 'ai')?.id

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden font-sans">
      <Header className="bg-transparent" />

      <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full relative">
              <WelcomeScreen
                query={query} setQuery={setQuery} focused={focused} setFocused={setFocused}
                isLoading={isLoading} inputRef={inputRef} onSubmit={handleSubmit}
              />
            </div>
          ) : (
            <div className="flex flex-col w-full">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isLastAi={m.id === lastAiId}
                    isLoading={isLoading}
                    index={i}
                  />
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-52" />
            </div>
          )}
        </div>

        {/* Floating bottom input — thread mode */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
            >
              <div className="bg-gradient-to-t from-zinc-50 via-zinc-50/95 to-transparent pt-12 pb-5 px-4 pointer-events-auto">
                <div className="max-w-2xl mx-auto space-y-2">
                  <InputBar
                    query={query} setQuery={setQuery} focused={focused} setFocused={setFocused}
                    isLoading={isLoading} inputRef={inputRef} onSubmit={handleSubmit}
                  />
                  <p className="text-center text-[11px] text-zinc-400">
                    AI may make mistakes · Always verify important information
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}