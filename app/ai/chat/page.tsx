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

export default function ParallaxaAi(){
  const [QueryPromptByUser, setQueryPromptByUser] = useState<string>('');
  const [isLoading, setIsloading] = useState(false)
  const startAiPipeline = () =>{
    
  }
  return (
    <main className = 'min-h-screen w-full bg-gray-50'>
      
      <Header includeTicker = {false}/>
      {/** main interface body**/}
      <div className = 'flex flex-col items-start justify-center'>
        {
          /**
          When send massage and response 
          **/
        }
        <div>
          <div className = 'flex items-center justify-start gap-2 w-full'>
            {
              /** Results Tab , Image tab and others **/
            }
          </div>
        </div>
        <div className = 'w-full flex items-center justify-between gap-2 m-4 rounded-full bg-white'>
          <Brain className = 'w-5 h-5'/>
          <input onChange = {(val)=> setQueryPromptByUser(val.target.value)} type = 'text' className = 'outline-none border-none bg-white' placeholder ='Search anything...'/>
          <button className = 'p-6 rounded-full bg-black text-white' disabled = {!QueryPromptByUser.length>2} onClick = {startAiPipeline}>
            <ArrowRight className = {`w-5 h-5 p-6 rounded-full bg-black text-white`}/>
          </button>
        </div>
      </div>
    </main>
  )
}