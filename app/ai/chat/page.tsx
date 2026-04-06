'use client'

import { Header } from '@/components/header'
import PinwheelLoader from '@/components/logo'
import {
  ArrowRight,
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
  AlignLeft,
  ExternalLink,
  Hash,
  Lightbulb,
  Home,
  Compass,
  Library,
  Settings,
  HelpCircle,
  Plus,
  MoreVertical,
  CheckCircle2,
  ImageIcon,
  History,
  Users,
  BadgeCheck,
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
    <h1 className="text-2xl font-bold text-[#1c1b1b] mt-6 mb-3 leading-tight font-['Inter'] tracking-tight">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold text-[#1c1b1b] mt-5 mb-2 leading-snug font-['Inter']">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-[#3d4a44] mt-4 mb-1 font-['Inter']">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-lg text-[#3d4a44] leading-[1.8] mb-4 font-['Newsreader',serif]">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 space-y-2 text-[#3d4a44] pl-1 font-['Newsreader',serif]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2 text-[#3d4a44] font-['Newsreader',serif]">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-lg leading-relaxed flex gap-2.5 items-start">
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
    <blockquote className="border-l-[3px] border-[#006950] pl-4 my-4 text-[#6d7a73] italic bg-[#f0eded] py-2 pr-3 rounded-r-lg font-['Newsreader',serif] text-lg">
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
    <th className="text-left py-2.5 px-4 font-semibold text-[#3d4a44] bg-[#f0eded] border-b border-[#bccac2] text-xs uppercase tracking-wider font-['Inter']">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="py-2.5 px-4 text-[#6d7a73] border-b border-[#f0eded] text-sm font-['Newsreader',serif]">{children}</td>
  ),
}

// ─── Side Nav ────────────────────────────────────────────────────────────────────

function SideNav({ hasMessages }: { hasMessages: boolean }) {
  return (
    <aside className="w-64 shrink-0 bg-[#f6f3f2] border-r border-[#e5e2e1]/60 flex flex-col h-screen sticky top-0 py-6 px-4 z-50">
      {/* Brand */}
      <div className="mb-10 px-2">
        <h1 className="text-xl font-bold tracking-tight text-[#1c1b1b] font-['Inter']">The Academic Workspace</h1>
        <p className="text-[10px] font-medium tracking-widest uppercase text-[#6d7a73] mt-1 font-['Inter']">Digital Curator</p>
      </div>

      {/* New Thread */}
      <button className="mb-8 flex items-center gap-3 px-4 py-3 bg-[#006950] text-white rounded-[0.75rem] font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all font-['Inter'] text-sm">
        <Plus className="w-4 h-4" />
        <span>New Thread</span>
      </button>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {[
          { icon: Home, label: 'Home', active: true },
          { icon: Compass, label: 'Discover', active: false },
          { icon: Library, label: 'Library', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <a
            key={label}
            href="#"
            className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer font-['Inter'] text-sm tracking-wide uppercase font-medium rounded-sm ${
              active
                ? 'text-[#006950] border-r-2 border-[#006950] bg-[#e5e2e1]/50'
                : 'text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#e5e2e1]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </a>
        ))}
      </nav>

      {/* Bottom Links */}
      <div className="pt-6 border-t border-[#e5e2e1]/50 space-y-1">
        {[
          { icon: Settings, label: 'Settings' },
          { icon: HelpCircle, label: 'Help' },
        ].map(({ icon: Icon, label }) => (
          <a
            key={label}
            href="#"
            className="flex items-center gap-3 px-4 py-2.5 text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#e5e2e1] transition-colors cursor-pointer font-['Inter'] text-sm tracking-wide uppercase font-medium"
          >
            <Icon className="w-4 h-4" />
            {label}
          </a>
        ))}

        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 py-4 mt-2 bg-[#e5e2e1]/30 rounded-[0.75rem]">
          <div className="w-8 h-8 rounded-full bg-[#006950] flex items-center justify-center text-white text-xs font-bold shrink-0">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#1c1b1b] font-['Inter']">User profile</span>
            <span className="text-[10px] text-[#6d7a73] uppercase tracking-tighter font-['Inter']">Pro Member</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Top Nav ─────────────────────────────────────────────────────────────────────

function TopNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
  const tabs = ['Sources', 'Insights', 'Media']
  return (
    <header className="h-16 bg-[#fcf9f8]/85 backdrop-blur-xl border-b border-[#e5e2e1]/40 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-6">
        {/* Model Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#eae7e7] rounded-full cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-[#006950]" />
          <span className="font-['Inter'] text-[10px] font-bold uppercase tracking-widest text-[#006950]">AI Research</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#6d7a73] rotate-90" />
        </div>

        {/* Tab Nav */}
        <nav className="flex items-center gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-['Inter'] text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                activeTab === tab
                  ? 'text-[#006950] border-b border-[#006950]/30 pb-0.5'
                  : 'text-[#6d7a73] hover:text-[#1c1b1b]'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="px-4 py-1.5 rounded-full border border-[#bccac2] text-xs font-bold uppercase tracking-widest font-['Inter'] hover:bg-[#eae7e7] transition-all text-[#3d4a44]">
          Share
        </button>
        <button className="text-[#6d7a73] hover:text-[#1c1b1b] transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

// ─── Source Cards ─────────────────────────────────────────────────────────────────

function SourceCards({ toolCalls, isLoading }: { toolCalls: ToolCall[]; isLoading: boolean }) {
  if (toolCalls.length === 0 && !isLoading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 mb-8 overflow-x-auto pb-2"
      style={{ scrollbarWidth: 'none' }}
    >
      {toolCalls.map((tc, i) => {
        const Icon = TOOL_ICONS[tc.name] || Search
        return (
          <motion.div
            key={tc.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex-shrink-0 w-44 p-3 rounded-[0.25rem] bg-white hover:bg-[#fcf9f8] border border-[#e5e2e1] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-sm bg-[#e5e2e1] flex items-center justify-center">
                <Icon className="w-2.5 h-2.5 text-[#006950]" />
              </div>
              <span className="text-[10px] font-bold text-[#6d7a73] uppercase tracking-tighter font-['Inter']">
                {TOOL_LABEL[tc.name] || tc.name}
              </span>
            </div>
            <p className="text-xs font-medium line-clamp-2 group-hover:text-[#006950] transition-colors text-[#3d4a44] font-['Inter'] leading-relaxed">
              {tc.preview || tc.args || 'Searching…'}
            </p>
            <div className="mt-2 flex items-center gap-1">
              {tc.done ? (
                tc.success !== false ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006950] block" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 block" />
                )
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#61dbb4] animate-pulse block" />
              )}
              <span className="text-[10px] text-[#6d7a73] font-['Inter']">{i + 1}</span>
            </div>
          </motion.div>
        )
      })}

      {isLoading && toolCalls.every((t) => t.done) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-shrink-0 w-44 p-3 rounded-[0.25rem] border border-dashed border-[#61dbb4] bg-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-3 h-3 text-[#006950] animate-spin" />
            <span className="text-[10px] font-bold text-[#006950] uppercase tracking-tighter font-['Inter']">Analyzing…</span>
          </div>
          <div className="space-y-1.5">
            {[70, 50, 60].map((w, i) => (
              <div key={i} className="h-2 bg-[#f0eded] rounded-full animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Citation Sidebar ─────────────────────────────────────────────────────────────

function CitationSidebar({ toolCalls }: { toolCalls: ToolCall[] }) {
  const doneCalls = toolCalls.filter((tc) => tc.done && tc.success !== false)

  return (
    <aside className="w-80 shrink-0 space-y-6">
      {/* Verification Block */}
      <div className="bg-[#f6f3f2] rounded-[0.5rem] p-6 border border-[#e5e2e1]/50">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-['Inter'] text-[11px] font-bold uppercase tracking-[0.15em] text-[#6d7a73]">Verification</h4>
          <BadgeCheck className="w-4 h-4 text-[#006950] fill-[#006950]/10" />
        </div>
        <div className="space-y-6">
          {doneCalls.length === 0 ? (
            <p className="text-[11px] text-[#6d7a73] font-['Inter'] italic">Sources will appear here once loaded.</p>
          ) : (
            doneCalls.slice(0, 3).map((tc, i) => (
              <div
                key={tc.id}
                className={`relative pl-6 border-l-2 ${i === 0 ? 'border-[#006950]' : 'border-[#bccac2]'} hover:border-[#006950] transition-all cursor-default`}
              >
                <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${i === 0 ? 'bg-[#006950]' : 'bg-[#bccac2]'}`} />
                <span className={`block text-[10px] font-bold mb-1 font-['Inter'] uppercase tracking-tighter ${i === 0 ? 'text-[#006950]' : 'text-[#6d7a73]'}`}>
                  Source {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-xs font-semibold leading-relaxed mb-2 italic text-[#3d4a44] font-['Newsreader',serif]">
                  "{tc.preview?.slice(0, 100)}…"
                </p>
                <p className="text-[10px] text-[#6d7a73] uppercase tracking-tighter font-['Inter']">
                  {TOOL_LABEL[tc.name] || tc.name}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Media Repository */}
      <div className="p-6 border border-[#e5e2e1]/40 rounded-[0.5rem]">
        <h4 className="font-['Inter'] text-[11px] font-bold uppercase tracking-[0.15em] text-[#6d7a73] mb-4">Media Repository</h4>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square bg-[#f0eded] rounded overflow-hidden flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#bccac2]" />
            </div>
          ))}
          <div className="flex items-center justify-center aspect-square bg-[#eae7e7] rounded text-[#6d7a73] font-bold text-[10px] tracking-widest uppercase cursor-pointer hover:bg-[#e5e2e1] transition-all font-['Inter']">
            View All
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-2">
      {[85, 70, 78, 60, 72, 55].map((w, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.08 }}
          className="h-4 bg-[#f0eded] rounded-full animate-pulse"
          style={{ width: `${w}%` }}
        />
      ))}
    </motion.div>
  )
}

// ─── Typing Dots ────────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-[#61dbb4] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ─── AI Message ─────────────────────────────────────────────────────────────────

function AiMessage({
  message,
  isLastAi,
  isLoading,
}: {
  message: Message
  isLastAi: boolean
  isLoading: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [liked, setLiked] = useState<null | 'up' | 'down'>(null)
  const isStreaming = isLastAi && isLoading && !message.content

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-12 pt-8 pb-10 border-b border-[#e5e2e1]/30"
    >
      {/* Main content */}
      <section className="flex-1 min-w-0">
        <SourceCards toolCalls={message.toolCalls} isLoading={isLastAi && isLoading} />

        {/* Answer header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#6d7a73] uppercase tracking-[0.15em] font-['Inter']">
            <Sparkles className="w-3 h-3 text-[#006950]" />
            Answer
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-[0.25rem] text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded] transition-all"
              title="Copy"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span key="c" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                    <Check className="w-3.5 h-3.5 text-[#006950]" />
                  </motion.span>
                ) : (
                  <motion.span key="x" initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
                    <Copy className="w-3.5 h-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button className="p-1.5 rounded-[0.25rem] text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded] transition-all">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLiked(liked === 'up' ? null : 'up')}
              className={`p-1.5 rounded-[0.25rem] transition-all ${liked === 'up' ? 'text-[#006950] bg-[#f0eded]' : 'text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded]'}`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLiked(liked === 'down' ? null : 'down')}
              className={`p-1.5 rounded-[0.25rem] transition-all ${liked === 'down' ? 'text-red-500 bg-red-50' : 'text-[#6d7a73] hover:text-[#1c1b1b] hover:bg-[#f0eded]'}`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#e5e2e1]/60 mb-6" />

        {/* Answer content */}
        <div>
          {isStreaming ? (
            <TypingDots />
          ) : !message.content ? (
            <SkeletonLoader />
          ) : (
            <motion.article
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="text-[#3d4a44]"
            >
              <Markdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={mdComponents}
              >
                {message.content}
              </Markdown>
            </motion.article>
          )}
        </div>

        {/* Related Inquiries */}
        {isLastAi && !isLoading && message.content && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="mt-10 pt-8 border-t border-[#e5e2e1]/20"
          >
            <h3 className="font-['Inter'] text-sm font-bold uppercase tracking-widest text-[#6d7a73] mb-4">
              Related Inquiries
            </h3>
            <div className="space-y-3">
              {['Tell me more about this topic', 'Summarize in key bullet points', 'Find related articles'].map((s) => (
                <button
                  key={s}
                  className="w-full text-left p-4 bg-[#f6f3f2] hover:bg-[#eae7e7] rounded-[0.5rem] transition-all flex items-center justify-between group border border-transparent hover:border-[#bccac2]"
                >
                  <span className="font-['Inter'] text-sm font-medium text-[#3d4a44] group-hover:text-[#1c1b1b]">{s}</span>
                  <Plus className="w-4 h-4 text-[#6d7a73] group-hover:text-[#006950] transition-colors" />
                </button>
              ))}
            </div>
          </motion.section>
        )}
      </section>

      {/* Citation sidebar */}
      <CitationSidebar toolCalls={message.toolCalls} />
    </motion.div>
  )
}

// ─── User Message ────────────────────────────────────────────────────────────────

function UserMessage({ message }: { message: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="pt-10 pb-2"
    >
      <h1 className="font-['Inter'] text-4xl font-extrabold tracking-tight text-[#1c1b1b] leading-tight">
        {message.content}
      </h1>
    </motion.div>
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
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative">
      {/* Subtle bg */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#7ff8cf]/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl space-y-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center space-y-3"
        >
          <h1 className="font-['Inter'] text-4xl font-extrabold tracking-tight text-[#1c1b1b]">
            What would you like to explore?
          </h1>
          <p className="font-['Newsreader',serif] text-lg italic text-[#6d7a73]">
            Powered by AI · Search · Summarize · Discover
          </p>
        </motion.div>

        {/* Main Input */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div
            className="flex items-center gap-3 px-5 py-3.5 bg-white rounded-full border border-[#bccac2] shadow-sm"
            style={{
              boxShadow: focused
                ? '0 0 0 2px rgba(0,105,80,0.15), 0 4px 20px rgba(0,0,0,0.06)'
                : '0 1px 6px rgba(0,0,0,0.05)',
            }}
          >
            <Brain className="w-4 h-4 text-[#6d7a73] shrink-0" />
            <input
              ref={inputRef as any}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
              placeholder="Ask a follow-up question..."
              className="flex-1 bg-transparent border-none outline-none font-['Newsreader',serif] text-lg placeholder:text-[#bccac2] placeholder:italic text-[#1c1b1b]"
            />
            <div className="flex items-center gap-1.5">
              <button className="p-2 text-[#6d7a73] hover:text-[#006950] transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSubmit()}
                disabled={!query.trim() || isLoading}
                className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
                  query.trim() && !isLoading
                    ? 'bg-[#006950] text-white hover:opacity-90 active:scale-90'
                    : 'bg-[#f0eded] text-[#bccac2] cursor-not-allowed'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Suggestion grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-2 gap-3"
        >
          {SUGGESTED_QUERIES.map(({ icon: Icon, text }, i) => (
            <motion.button
              key={text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSubmit(text)}
              className="flex items-center justify-between p-4 rounded-[0.5rem] border border-[#e5e2e1] bg-white hover:border-[#bccac2] hover:bg-[#f6f3f2] transition-all text-left group shadow-sm"
            >
              <span className="font-['Inter'] text-sm font-medium text-[#3d4a44] group-hover:text-[#1c1b1b] leading-snug pr-2">
                {text}
              </span>
              <Plus className="w-4 h-4 text-[#6d7a73] group-hover:text-[#006950] transition-colors shrink-0" />
            </motion.button>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-8"
        >
          {[
            { icon: History, label: 'Search History' },
            { icon: Users, label: 'Collaborate' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer text-[#3d4a44]"
            >
              <Icon className="w-3 h-3" />
              <span className="font-['Inter'] text-[10px] font-bold uppercase tracking-widest">{label}</span>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// ─── Persistent Follow-up Bar ─────────────────────────────────────────────────────

function FollowUpBar({
  query,
  setQuery,
  focused,
  setFocused,
  isLoading,
  inputRef,
  onSubmit,
}: any) {
  return (
    <div className="sticky bottom-0 left-0 right-0 pt-12 pb-6 bg-gradient-to-t from-[#fcf9f8] via-[#fcf9f8]/95 to-transparent pointer-events-none">
      <div className="max-w-4xl mx-auto pointer-events-auto space-y-3">
        <div
          className="bg-[#fcf9f8]/85 backdrop-blur-2xl rounded-full p-2 pl-6 flex items-center gap-4 border border-[#e5e2e1]/30"
          style={{
            boxShadow: focused
              ? '0 0 0 2px rgba(0,105,80,0.12), 0 12px 40px rgba(28,27,27,0.08)'
              : '0 12px 40px rgba(28,27,27,0.06)',
          }}
        >
          <Brain className="w-4 h-4 text-[#6d7a73] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
            placeholder="Ask a follow-up question..."
            className="flex-1 bg-transparent border-none outline-none font-['Newsreader',serif] text-lg placeholder:text-[#bccac2] placeholder:italic text-[#1c1b1b]"
          />
          <div className="flex items-center gap-2">
            <button className="p-2 text-[#6d7a73] hover:text-[#006950] transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSubmit()}
              disabled={!query.trim() || isLoading}
              className={`p-2.5 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                query.trim() && !isLoading
                  ? 'bg-[#006950] text-white hover:opacity-90'
                  : 'bg-[#f0eded] text-[#bccac2] cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-center gap-6">
          {[
            { icon: History, label: 'Search History' },
            { icon: Users, label: 'Collaborate' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer text-[#3d4a44]"
            >
              <Icon className="w-3 h-3" />
              <span className="font-['Inter'] text-[10px] font-bold uppercase tracking-widest">{label}</span>
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
  const [activeTab, setActiveTab] = useState('Sources')

  const inputRef = useRef<HTMLInputElement>(null)
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
            } catch { /* ignore */ }
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
    <div
      className="flex h-screen overflow-hidden text-[#1c1b1b]"
      style={{ background: '#fcf9f8', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Sidebar */}
      <SideNav hasMessages={messages.length > 0} />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Nav */}
        <TopNav activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Scrollable canvas */}
        <div className="flex-1 overflow-y-auto relative" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e2e1 transparent' }}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col">
              <WelcomeScreen
                query={query} setQuery={setQuery} focused={focused} setFocused={setFocused}
                isLoading={isLoading} inputRef={inputRef} onSubmit={handleSubmit}
              />
            </div>
          ) : (
            <div className="px-12 max-w-7xl mx-auto">
              <AnimatePresence initial={false}>
                {messages.map((m) =>
                  m.from === 'user' ? (
                    <UserMessage key={m.id} message={m} />
                  ) : (
                    <AiMessage
                      key={m.id}
                      message={m}
                      isLastAi={m.id === lastAiId}
                      isLoading={isLoading}
                    />
                  )
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />

              {/* Follow-up bar */}
              <FollowUpBar
                query={query} setQuery={setQuery} focused={focused} setFocused={setFocused}
                isLoading={isLoading} inputRef={inputRef} onSubmit={handleSubmit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}