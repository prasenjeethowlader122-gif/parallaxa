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
  Plus,
  Clock,
  Globe,
  Library,
  Share2
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

// ─── Types & Constants ─────────────────────────────────────────────────────────

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

const TOOL_LABEL: Record<string, string> = {
  semantic_search: 'Semantic Search',
  search_articles: 'Keyword Search',
  get_articles_by_category: 'Categories',
  get_breaking_news: 'Breaking News',
  get_featured_articles: 'Featured',
  get_trending_articles: 'Trending',
  get_article_by_slug: 'Article Content',
  get_context_for_question: 'Knowledge Base',
  summarize_article: 'Summary',
}

// ─── Markdown Components ───────────────────────────────────────────────────────

const mdComponents: Components = {
  code: ({ children, className }: ComponentPropsWithoutRef<'code'>) => {
    if (!className) return <code className="bg-gray-100 text-blue-600 px-1 rounded font-mono text-[0.9em]">{children}</code>
    return (
      <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto my-3 text-xs font-mono text-gray-800">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-6 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-800 mt-5 mb-2">{children}</h2>,
  p: ({ children }) => <p className="text-[15px] text-gray-700 leading-relaxed mb-4">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 text-[15px] text-gray-700">{children}</ul>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" className="text-blue-600 hover:underline font-medium">
      {children}
    </a>
  ),
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

function SourceCard({ tc, index }: { tc: ToolCall; index: number }) {
  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all cursor-pointer group shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Source {index + 1}</span>
        <Globe className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition-colors" />
      </div>
      <p className="text-[12px] font-medium text-gray-700 line-clamp-1">
        {TOOL_LABEL[tc.name] || tc.name}
      </p>
      <p className="text-[10px] text-gray-400 truncate italic">
        {tc.preview || 'External context gathered'}
      </p>
    </div>
  )
}

function MessageBubble({ message, isLastAi, isLoading }: { message: Message; isLastAi: boolean; isLoading: boolean }) {
  const isUser = message.from === 'user'

  if (isUser) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-10">
        <h1 className={`text-3xl md:text-4xl font-medium text-gray-900 tracking-tight leading-tight ${slabo.className}`}>
          {message.content}
        </h1>
      </div>
    )
  }

  return (
    <div className="w-full border-b border-gray-100 bg-white pb-16">
      <div className="max-w-3xl mx-auto px-6 space-y-8">
        
        {/* Thinking State */}
        {message.thinking && (
          <div className="flex items-center gap-2 text-gray-400 text-xs italic">
            <Brain className="w-3.5 h-3.5 animate-pulse" />
            <span>Analyzing sources...</span>
          </div>
        )}

        {/* Perplexity Style Source Grid */}
        {message.toolCalls.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
              <Layers className="w-4 h-4 text-blue-500" />
              Sources
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {message.toolCalls.map((tc, i) => (
                <SourceCard key={tc.id} tc={tc} index={i} />
              ))}
              {isLoading && isLastAi && (
                <div className="flex items-center justify-center p-4 border border-dashed border-gray-200 rounded-xl animate-pulse bg-gray-50/50">
                  <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Answer Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
              <div className="bg-green-600 rounded-full p-1">
                <CheckCheck className="w-3 h-3 text-white" />
              </div>
              Answer
            </div>
            <div className="flex items-center gap-3">
              <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400"><Share2 className="w-4 h-4" /></button>
              <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-400"><Copy className="w-4 h-4" /></button>
            </div>
          </div>

          <div className={`prose prose-blue max-w-none ${spacegrotesk.className}`}>
            {!message.content && isLoading ? (
               <div className="space-y-2">
                 <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                 <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
               </div>
            ) : (
              <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={mdComponents}>
                {message.content}
              </Markdown>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Interface ────────────────────────────────────────────────────────────

export default function AiInterfaceChat() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamStateRef = useRef<{ text: string; tools: Map<string, ToolCall> }>({ text: '', tools: new Map() })

  const handleSubmit = async (overrideQuery?: string) => {
    const trimmed = (overrideQuery ?? query).trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = { id: Date.now().toString(), from: 'user', content: trimmed, toolCalls: [] }
    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setIsLoading(true)

    // AI Logic (Streaming Fetch)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage].map(m => ({ role: m.from, content: m.content })) }),
      })

      const aiMessage: Message = { id: (Date.now() + 1).toString(), from: 'ai', content: '', toolCalls: [] }
      setMessages((prev) => [...prev, aiMessage])
      
      // ... (Streaming parser logic remains same as your original)
      // Note: Call handleStreamEvent here during your reader loop
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans">
      {/* Sidebar - Perplexity Navigation */}
      <aside className="w-64 border-r border-gray-100 hidden lg:flex flex-col p-4 bg-[#F9F9F9]">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <PinwheelLoader size={28} isfill={true} isDone={!isLoading} />
          <span className={`font-bold text-xl tracking-tight ${slabo.className}`}>Parallaxa</span>
        </div>
        
        <button 
          onClick={() => setMessages([])}
          className="flex items-center justify-between w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold shadow-sm hover:border-gray-300 transition-all active:scale-95"
        >
          New Thread
          <Plus className="w-4 h-4 text-gray-400" />
        </button>

        <nav className="mt-8 space-y-1 flex-1">
          <NavItem icon={Search} label="Home" active />
          <NavItem icon={Globe} label="Discover" />
          <NavItem icon={Library} label="Library" />
          <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent</div>
          <NavItem icon={Clock} label="Market Analysis..." small />
          <NavItem icon={Clock} label="Next.js App Router..." small />
        </nav>

        <div className="mt-auto p-2 bg-blue-50 rounded-xl border border-blue-100">
           <p className="text-[11px] font-bold text-blue-600 px-2">PRO PLAN</p>
           <p className="text-[10px] text-blue-400 px-2 mb-2">Get advanced models</p>
           <button className="w-full py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">Upgrade</button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
        <header className="h-14 border-b border-gray-50 flex items-center justify-between px-6 lg:hidden">
          <PinwheelLoader size={24} isfill={true} isDone={true} />
          <Plus className="w-5 h-5 text-gray-600" onClick={() => setMessages([])} />
        </header>

        <div className="flex-1 overflow-y-auto scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-8">
              <h2 className={`text-4xl font-medium text-center max-w-lg leading-tight ${slabo.className}`}>
                Where knowledge begins.
              </h2>
              <div className="w-full max-w-2xl">
                 <InputBar query={query} setQuery={setQuery} focused={focused} setFocused={setFocused} isLoading={isLoading} inputRef={inputRef} onSubmit={handleSubmit} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} isLastAi={m.from === 'ai'} isLoading={isLoading} />
              ))}
              <div ref={messagesEndRef} className="h-40" />
            </div>
          )}
        </div>

        {/* Floating Bottom Input (only when chat has started) */}
        {messages.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4">
            <div className="max-w-3xl mx-auto">
              <InputBar query={query} setQuery={setQuery} focused={focused} setFocused={setFocused} isLoading={isLoading} inputRef={inputRef} onSubmit={handleSubmit} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active, small }: any) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-gray-200/50 text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-200/30'}`}>
      <Icon className={`${small ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
      <span className={`${small ? 'text-xs' : 'text-sm'} truncate`}>{label}</span>
    </div>
  )
}

function InputBar({ query, setQuery, focused, setFocused, isLoading, inputRef, onSubmit }: any) {
  return (
    <div className={`group relative flex flex-col w-full bg-[#F3F3F3] border transition-all duration-300 rounded-2xl ${focused ? 'bg-white border-gray-300 shadow-xl ring-4 ring-gray-50' : 'border-transparent shadow-sm'}`}>
      <textarea
        ref={inputRef}
        rows={1}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = e.target.scrollHeight + 'px'
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSubmit())}
        placeholder="Ask anything..."
        className="w-full resize-none bg-transparent px-5 py-4 text-[15px] outline-none text-gray-800 placeholder:text-gray-500 min-h-[56px] max-h-40"
      />
      
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200/50 rounded-full transition-colors">
            <Zap className="w-3.5 h-3.5" /> Focus
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200/50 rounded-full transition-colors">
            <Plus className="w-3.5 h-3.5" /> File
          </button>
        </div>

        <button
          onClick={onSubmit}
          disabled={!query.trim() || isLoading}
          className={`p-2 rounded-full transition-all ${query.trim() ? 'bg-gray-900 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400'}`}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}