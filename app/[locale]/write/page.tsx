"use client";

import { slabo } from '@/lib/font'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  ComponentPropsWithoutRef,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from '@codemirror/view'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { RangeSetBuilder } from '@codemirror/state'
import rehypeRaw from 'rehype-raw'
import {
  ChevronRight,
  SearchCheck,
  Accessibility,
  Tag,
  Share2,
  Settings,
  HelpCircle,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Quote,
  Link,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  Check,
  Copy,
  List,
  ListOrdered,
  Strikethrough,
  Code,
  Minus,
  RotateCcw,
  RotateCw,
  Clock,
  Star,
  Zap,
  TrendingUp,
  PanelLeft,
  SlidersHorizontal,
  Info,
  Youtube,
  Facebook,
  Twitter,
  Instagram,
  Github,
  Box,
  ChevronDown,
  Heading3,
  Layout,
  SquarePlus,
  Highlighter,
  Terminal,
  Eye,
  Sparkles,
  PenTool,
  Columns2,
  Search,
  Loader2,
} from 'lucide-react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeMermaid from 'rehype-mermaid'
import Markdown, { Components } from 'react-markdown'
import { createCustomBlockPlugin, blockRegistry, DBBlockConfig } from '@/lib/mdx/block-registry'
import '@/lib/mdx/blocks'
import { customBlockComponents } from '@/components/mdx/CustomBlockRenderer'
import { BlockSearchPanel } from '@/components/mdx/BlockSearchPanel'

type SidebarTab = 'metadata' | 'seo' | 'accessibility' | 'tags' | 'distribution'
type ViewMode = 'write' | 'preview' | 'split'
type Visibility = 'public' | 'private' | 'unlisted'
type ArticleStatus = 'draft' | 'published' | 'scheduled'

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-[#efedee] text-[#585f64] px-1.5 py-0.5 rounded-xl text-[0.82em] font-mono break-all">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-[#dcdad9] bg-[#1a1a1a] text-gray-100 max-w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#222] border-b border-[#333]">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{lang}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code.trim())
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          }}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[13px] leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const mdComponents: Components = {
  ...customBlockComponents,
  code: CodeBlock as Components['code'],
  h1: ({ children }) => <h1 className="text-3xl font-bold text-[#1a1b1c] mt-8 mb-4 leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-semibold text-[#1a1b1c] mt-6 mb-3 leading-snug">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold text-[#313334] mt-5 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-[#313334] text-[1.05rem] leading-[1.85] my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-4 flex flex-col gap-2 text-[1.05rem] text-[#313334]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-4 flex flex-col gap-2 text-[1.05rem] text-[#313334]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => {
    const childrenArray = React.Children.toArray(children)
    const firstChild = childrenArray[0]
    if (React.isValidElement(firstChild) && (firstChild as any).type === 'p') {
      const pChildren = React.Children.toArray((firstChild as any).props.children)
      const firstPChild = pChildren[0]
      if (typeof firstPChild === 'string' && firstPChild.trim().startsWith('[!NOTE]')) {
        const cleanFirstChild = firstPChild.trim().replace('[!NOTE]', '').trim()
        const remainingPChildren = pChildren.slice(1)
        return (
          <div className="my-6 p-5 bg-blue-50/60 border border-blue-100 rounded-xl flex gap-4 items-start">
            <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Info size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500/80 mb-1.5">Note</p>
              <div className="text-blue-900/80 text-sm leading-relaxed">
                {cleanFirstChild}{remainingPChildren}{childrenArray.slice(1)}
              </div>
            </div>
          </div>
        )
      }
    }
    return <blockquote className="border-l-[3px] border-[#585f64] pl-5 my-5 text-[#5e5f61] italic text-lg">{children}</blockquote>
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-5 rounded-xl border border-[#e4e2e1]">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#f5f3f3] text-[#585f64]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[#efedee]">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-[#faf9f9] transition-colors">{children}</tr>,
  th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-4 py-3 text-[#313334]">{children}</td>,
  hr: () => <hr className="my-8 border-[#e4e2e1]" />,
  strong: ({ children }) => <strong className="font-bold text-[#1a1b1c]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#5e5f61]">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#585f64] underline underline-offset-2 decoration-[#dcdad9] hover:text-[#313334] hover:decoration-[#585f64] transition-colors"
    >
      {children}
    </a>
  ),
}

function MarkdownPreview({ content, dbBlocks }: { content: string; dbBlocks: DBBlockConfig[] }) {
  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#f5f3f3] flex items-center justify-center">
          <Eye size={20} className="text-[#c0bebe]" />
        </div>
        <p className="text-[#c0bebe] font-['Newsreader'] italic text-lg">Nothing to preview yet…</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 overflow-hidden w-full">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath, [createCustomBlockPlugin, dbBlocks] as any]}
        rehypePlugins={[rehypeRaw, [rehypeMermaid], rehypeKatex]}
        components={mdComponents}
      >
        {content}
      </Markdown>
    </div>
  )
}

const ToolbarBtn = ({
  icon: Icon,
  label,
  onClick,
  active,
  className = '',
}: {
  icon: any
  label: string
  onClick: () => void
  active?: boolean
  className?: string
}) => (
  <button
    type="button"
    title={label}
    onClick={onClick}
    className={`p-2 rounded-xl transition-all shrink-0 ${
      active ? 'bg-[#585f64] text-white' : 'text-[#7a8086] hover:bg-[#f0eeee] hover:text-[#313334]'
    } ${className}`}
  >
    <Icon className="w-[15px] h-[15px]" />
  </button>
)

const SidebarLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9e9fa0]">{children}</label>
)

const SEOItem = ({ success, text }: { success: boolean; text: string }) => (
  <div className="flex items-start gap-2.5">
    {success
      ? <CheckCircle2 size={13} className="text-emerald-600 mt-0.5 shrink-0" fill="currentColor" />
      : <AlertCircle size={13} className="text-[#c0483d] mt-0.5 shrink-0" fill="currentColor" />
    }
    <span className="text-xs text-[#313334] leading-snug min-w-0">{text}</span>
  </div>
)

const InputField = React.memo(function InputField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <SidebarLabel>{label}</SidebarLabel>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-xl px-3 py-2 resize-none focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none placeholder-[#c8c6c6] transition-all"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-xl px-3 py-2 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none placeholder-[#c8c6c6] transition-all"
        />
      )}
      {hint && <p className="text-[10px] text-[#b8b9ba]">{hint}</p>}
    </div>
  )
})

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) => (
  <div className="flex flex-col gap-1.5">
    <SidebarLabel>{label}</SidebarLabel>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-xl px-3 py-2 pr-8 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none transition-all cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9fa0] pointer-events-none" />
    </div>
  </div>
)

const Toggle = ({
  label,
  checked,
  onChange,
  description,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-[#313334]">{label}</p>
      {description && <p className="text-[10px] text-[#b8b9ba] mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative shrink-0 w-8 h-[18px] rounded-xl transition-colors duration-200 ${
        checked ? 'bg-[#585f64]' : 'bg-[#dcdad9]'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-xl bg-white shadow-none transition-transform duration-200 ${
          checked ? 'translate-x-[14px]' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white rounded-xl p-3.5 border border-[#e4e2e1]">
    <p className="text-[9px] uppercase tracking-widest text-[#b8b9ba] mb-1">{label}</p>
    <p className="text-[15px] font-bold text-[#313334] tabular-nums">{value}</p>
  </div>
)

const Section = ({ title, icon: Icon, children, hint }: { title: string; icon?: any; children: React.ReactNode; hint?: string }) => (
  <div className="flex flex-col gap-4 bg-[#faf9f9] rounded-xl border border-[#eeecec] p-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-[#9e9fa0]" />}
        <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#585f64]">{title}</h4>
      </div>
      {hint && (
        <span title={hint} className="text-[#c8c6c6] hover:text-[#9e9fa0] transition-colors cursor-help">
          <HelpCircle size={13} />
        </span>
      )}
    </div>
    {children}
  </div>
)

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200))
}

const SIDEBAR_TABS: { id: SidebarTab; label: string; icon: any }[] = [
  { id: 'metadata', label: 'Metadata', icon: Settings },
  { id: 'seo', label: 'SEO', icon: SearchCheck },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'tags', label: 'Tags & Badges', icon: Tag },
  { id: 'distribution', label: 'Distribution', icon: Share2 },
]

const EditorPage = ({ searchParams }: { searchParams: Promise<{ id?: string }> }) => {
  const resolvedParams = React.use(searchParams)
  const id = resolvedParams.id

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('write')
  const [isDesktop, setIsDesktop] = useState(false)

  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SidebarTab>('metadata')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [history, setHistory] = useState<string[]>([''])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [category, setCategory] = useState('')
  const [author, setAuthor] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [status, setStatus] = useState<ArticleStatus>('draft')
  const [featured, setFeatured] = useState(false)
  const [breaking, setBreaking] = useState(false)
  const [trending, setTrending] = useState(false)
  const [coverImage, setCoverImage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [twitterCard, setTwitterCard] = useState('summary_large_image')
  const [noIndex, setNoIndex] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [showInRss, setShowInRss] = useState(true)
  const [ampEnabled, setAmpEnabled] = useState(false)
  const [cssClass, setCssClass] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [blockSearchOpen, setBlockSearchOpen] = useState(false)
  const [dbBlocks, setDbBlocks] = useState<DBBlockConfig[]>([])

  const editorRef = useRef<any>(null)
  const blockSearchRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.name && !author) setAuthor(session.user.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.name])

  useEffect(() => {
    fetch('/api/blocks?user=1')
      .then(r => (r.ok ? r.json() : []))
      .then(data => Array.isArray(data) ? setDbBlocks(data) : null)
      .catch(() => null)
  }, [])

  // Combine statically-registered blocks with user/DB-defined blocks so both
  // the "Blocks" panel and the in-editor autocomplete stay in sync.
  const allBlocks = useMemo(
    () => [...blockRegistry.getAllBlocks(), ...dbBlocks] as DBBlockConfig[],
    [dbBlocks]
  )

  const markUnsaved = useCallback(() => {
    setSaveStatus('unsaved')
  }, [])

  useEffect(() => {
    if (saveStatus !== 'unsaved') return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving')
      setTimeout(() => {
        setSaveStatus('saved')
        setLastSaved(new Date())
      }, 600)
    }, 2000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [saveStatus])

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return
      try {
        const res = await fetch(`/api/articles/${id}`)
        if (res.ok) {
          const data = await res.json()
          setContent(data.content || '')
          setTitle(data.title || '')
          if (data.author) setAuthor(data.author)
          setCategory(data.category || '')
          setCoverImage(data.image || '')
          setTags(data.tags || [])
          setFeatured(!!data.featured)
          setBreaking(!!data.breaking)
          setTrending(!!data.trending)
          setVisibility(data.visibility || 'public')
          setStatus(data.status || 'draft')
          setScheduledAt(data.scheduledAt ? new Date(data.scheduledAt).toISOString().slice(0, 16) : '')
          setSeoTitle(data.seoTitle || '')
          setMetaDescription(data.metaDescription || data.description || '')
          setFocusKeyword(data.focusKeyword || '')
          setCanonicalUrl(data.canonicalUrl || '')
          setOgImage(data.ogImage || '')
          setTwitterCard(data.twitterCard || 'summary_large_image')
          setNoIndex(!!data.noIndex)
          setAllowComments(data.allowComments ?? true)
          setShowInRss(data.showInRss ?? true)
          setAmpEnabled(!!data.ampEnabled)
          setCssClass(data.cssClass || '')
          setRedirectUrl(data.redirectUrl || '')
          setHistory([data.content || ''])
          setHistoryIndex(0)
          setLastSaved(new Date())
        }
      } catch (error) {
        console.error('Failed to fetch article:', error)
      }
    }
    fetchArticle()
  }, [id])

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [title])

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 1024)
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
      if (!desktop && viewMode === 'split') setViewMode('write')
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileDrawerOpen(false)
      else setSidebarOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (blockSearchRef.current && !blockSearchRef.current.contains(e.target as Node)) {
        setBlockSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (sidebarOpen || mobileDrawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [sidebarOpen, mobileDrawerOpen])

  const markdownTheme = EditorView.theme({
    '&': {
      fontSize: '1.05rem',
      fontFamily: 'var(--font-slabo), Georgia, serif',
      background: 'transparent !important',
      color: '#1a1b1c',
    },
    '.cm-content': { padding: '0', caretColor: '#1a1b1c' },
    '.cm-line': { padding: '0 0 2px', lineHeight: '1.85' },
    '.cm-focused': { outline: 'none !important' },
    '.cm-editor': { background: 'transparent !important' },
    '.cm-scroller': { overflow: 'visible' },
    '.cm-header-1': { fontSize: '1.7em', fontWeight: '700', color: '#000' },
    '.cm-header-2': { fontSize: '1.4em', fontWeight: '600', color: '#1a1b1c' },
    '.cm-header-3': { fontSize: '1.2em', fontWeight: '600', color: '#313334' },
    '.cm-strong': { fontWeight: '700', color: '#000' },
    '.cm-em': { fontStyle: 'italic', color: '#5e5f61' },
    '.cm-strikethrough': { textDecoration: 'line-through', color: '#9e9fa0' },
    '.cm-monospace': { fontFamily: 'monospace', background: '#efedee', color: '#585f64', borderRadius: '3px', padding: '0 3px' },
    '.cm-link': { color: '#585f64', textDecoration: 'underline' },
    '.cm-url': { color: '#b8b9ba' },
    '.cm-quote': { color: '#5e5f61', fontStyle: 'italic' },
    '.cm-gutters': { display: 'none' },
    '.cm-activeLineGutter': { display: 'none' },
    '.cm-activeLine': { background: 'rgba(88,95,100,0.04)' },
    '.cm-selectionBackground': { background: 'rgba(88,95,100,0.12) !important' },
    '.cm-custom-block': {
      color: '#b45309',
      fontWeight: '600',
      backgroundColor: '#fef9c3',
      padding: '1px 5px',
      borderRadius: '4px',
      border: '1px solid #fde68a',
      fontFamily: 'var(--font-slabo), Georgia, serif',
      fontSize: '0.9em',
    }
  })

  const customBlockHighlight = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.getDecorations(update.view)
    }
    getDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()
      const text = view.state.doc.toString()
      const regex = /\[!.+?\(url=\".+?\"\)\]/g
      let match
      while ((match = regex.exec(text)) !== null) {
        builder.add(match.index, match.index + match[0].length, Decoration.mark({ class: 'cm-custom-block' }))
      }
      return builder.finish()
    }
  }, { decorations: v => v.decorations })

  const customBlockCompletions = useCallback((context: CompletionContext) => {
    const word = context.matchBefore(/\[!/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null
    const options = allBlocks.map(block => ({
      label: block.template || `[!${block.name}()]`,
      type: 'function',
      apply: block.template || `[!${block.name}()]`,
    }))
    return { from: word.from, options }
  }, [allBlocks])

  const pushHistory = useCallback((val: string) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), val].slice(-100))
    setHistoryIndex(i => Math.min(i + 1, 99))
  }, [historyIndex])

  const undo = () => {
    if (historyIndex > 0) {
      const i = historyIndex - 1
      setContent(history[i])
      setHistoryIndex(i)
      markUnsaved()
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const i = historyIndex + 1
      setContent(history[i])
      setHistoryIndex(i)
      markUnsaved()
    }
  }

  const handleContentChange = (val: string) => {
    setContent(val)
    markUnsaved()
    pushHistory(val)
  }

  const insertMarkdown = useCallback((before: string, after = '', placeholder = '') => {
    const view = editorRef.current?.view
    if (!view) return
    const { state } = view
    const { from, to } = state.selection.main
    const selected = state.sliceDoc(from, to) || placeholder
    view.dispatch({
      changes: { from, to, insert: before + selected + after },
      selection: { anchor: from + before.length + selected.length },
      scrollIntoView: true
    })
    view.focus()
  }, [])

  const insertLinePrefix = useCallback((prefix: string) => {
    const view = editorRef.current?.view
    if (!view) return
    const { state } = view
    const { from } = state.selection.main
    const line = state.doc.lineAt(from)
    view.dispatch({
      changes: { from: line.from, insert: prefix },
      selection: { anchor: from + prefix.length },
      scrollIntoView: true
    })
    view.focus()
  }, [])

  const handleBlockInsert = useCallback((block: { name: string; template?: string }) => {
    if (block.template) {
      const closingIdx = block.template.lastIndexOf(')')
      const before = block.template.slice(0, closingIdx)
      const after = block.template.slice(closingIdx)
      if (before.endsWith('url=""')) {
        insertMarkdown(before.slice(0, -1), '"' + after)
      } else {
        insertMarkdown(before, after)
      }
    } else {
      insertMarkdown(`[!${block.name}(url="`, '")]')
    }
  }, [insertMarkdown])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
      markUnsaved()
    }
    setTagInput('')
  }

  const removeTag = (t: string) => {
    setTags(tags.filter(x => x !== t))
    markUnsaved()
  }

  const seoChecks = [
    { success: title.length >= 10 && title.length <= 70, text: `Title length: ${title.length}/70 chars` },
    { success: !!focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase()), text: 'Focus keyword in title' },
    { success: metaDescription.length >= 120 && metaDescription.length <= 160, text: `Meta desc: ${metaDescription.length}/160 chars` },
    { success: countWords(content) >= 300, text: `Word count ≥ 300 (${countWords(content)} words)` },
    { success: !!coverImage, text: 'Cover image set' },
    { success: !noIndex, text: 'Page is indexable' },
  ]
  const seoScore = Math.round((seoChecks.filter(c => c.success).length / seoChecks.length) * 100)

  const a11yChecks = [
    { success: title.trim().length > 0, text: 'Article has a title' },
    { success: content.length > 0, text: 'Article has content' },
    { success: !!coverImage, text: 'Cover image provided' },
    { success: allowComments, text: 'Comments enabled' },
    { success: ampEnabled, text: 'AMP compatibility configured' },
  ]

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const isFuture = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now()
      const payload = {
        title,
        description: metaDescription || '',
        content,
        category,
        image: coverImage,
        readTime: estimateReadTime(content),
        featured,
        breaking,
        trending,
        tags,
        author,
        seoTitle,
        metaDescription,
        focusKeyword,
        canonicalUrl,
        ogImage,
        twitterCard,
        noIndex,
        allowComments,
        showInRss,
        ampEnabled,
        redirectUrl,
        cssClass,
        visibility,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        status: isFuture ? 'scheduled' : 'published',
      }
      const res = await fetch(id ? `/api/articles/${id}` : '/api/articles', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Publish failed')
      if (!id && j?.id) {
        await fetch('/api/ptp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: j.id }),
        })
      }
      setStatus(isFuture ? 'scheduled' : 'published')
      setShowPublishModal(false)
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch (e) {
      console.error('Publishing error:', e)
      alert(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const saveLabel = () => {
    if (saveStatus === 'saving') return 'Saving…'
    if (saveStatus === 'unsaved') return 'Unsaved'
    if (lastSaved) {
      const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000)
      if (diff < 60) return `Saved ${diff}s ago`
      return `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    return 'Saved'
  }

  // Full-width settings panel. Used both as the desktop overlay (sidebarOpen)
  // and the mobile drawer (mobileDrawerOpen); `wide` switches between a
  // multi-column desktop layout and a single-column mobile layout.
  //
  // IMPORTANT: this is a plain function that RETURNS jsx — it is called
  // directly as `{renderSidebarPanel({...})}`, never rendered as `<X />`.
  // If it were written as a component (`const X = (props) => <div/>`) and
  // rendered as `<X />`, React would treat every re-render as a brand new
  // component type (since the function reference is recreated on each
  // render of EditorPage) and would unmount/remount the whole subtree —
  // which is exactly what was dropping focus and dismissing the mobile
  // keyboard on every keystroke.
  const renderSidebarPanel = ({ wide, onClose }: { wide?: boolean; onClose: () => void }) => (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className={`flex items-center gap-1.5 px-5 sm:px-8 py-4 border-b border-[#eeecec] shrink-0 overflow-x-auto no-scrollbar ${wide ? '' : ''}`} style={{ scrollbarWidth: 'none' }}>
        {SIDEBAR_TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                active ? 'bg-slate-900 text-white' : 'text-[#7a8086] hover:bg-[#f0eeee] hover:text-[#313334]'
              }`}
            >
              <Icon size={13} />
              <span>{t.label}</span>
            </button>
          )
        })}
        <div className="flex-1" />
        {wide && (
          <button
            onClick={onClose}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#9e9fa0] hover:bg-[#f0eeee] hover:text-[#313334] transition-colors shrink-0"
          >
            <X size={13} />
            Close
          </button>
        )}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
        <div className={`grid gap-5 ${wide ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 max-w-6xl mx-auto' : 'grid-cols-1'}`}>

          {activeTab === 'metadata' && (
            <>
              <Section title="Article info" icon={Settings}>
                <InputField label="Category" value={category} onChange={(v) => { setCategory(v); markUnsaved() }} placeholder="e.g. Technology" />
                <InputField label="Author" value={author} onChange={(v) => { setAuthor(v); markUnsaved() }} />
                <InputField label="Cover Image URL" value={coverImage} onChange={(v) => { setCoverImage(v); markUnsaved() }} placeholder="https://…" />
              </Section>
              <Section title="Advanced" icon={Terminal} hint="Extra hooks for styling or migrated URLs">
                <InputField label="Custom CSS class" value={cssClass} onChange={(v) => { setCssClass(v); markUnsaved() }} placeholder="e.g. long-form" />
                <InputField label="Redirect URL" value={redirectUrl} onChange={(v) => { setRedirectUrl(v); markUnsaved() }} placeholder="https://old-url…" />
              </Section>
              <Section title="At a glance">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Words" value={countWords(content).toLocaleString()} />
                  <StatCard label="Read time" value={`${estimateReadTime(content)} min`} />
                </div>
              </Section>
            </>
          )}

          {activeTab === 'seo' && (
            <>
              <Section title="Search appearance" icon={SearchCheck}>
                <InputField label="SEO title" value={seoTitle} onChange={(v) => { setSeoTitle(v); markUnsaved() }} placeholder={title || 'Falls back to article title'} />
                <InputField label="Meta description" value={metaDescription} onChange={(v) => { setMetaDescription(v); markUnsaved() }} multiline placeholder="120–160 characters" hint={`${metaDescription.length}/160`} />
                <InputField label="Focus keyword" value={focusKeyword} onChange={(v) => { setFocusKeyword(v); markUnsaved() }} placeholder="e.g. climate policy" />
                <InputField label="Canonical URL" value={canonicalUrl} onChange={(v) => { setCanonicalUrl(v); markUnsaved() }} placeholder="https://…" />
              </Section>
              <Section title="Social preview" icon={Share2}>
                <InputField label="OG image URL" value={ogImage} onChange={(v) => { setOgImage(v); markUnsaved() }} placeholder="Falls back to cover image" />
                <SelectField
                  label="Twitter card type"
                  value={twitterCard}
                  onChange={(v) => { setTwitterCard(v); markUnsaved() }}
                  options={[
                    { value: 'summary_large_image', label: 'Large image' },
                    { value: 'summary', label: 'Summary' },
                  ]}
                />
                <Toggle label="Hide from search engines" description="Adds a noindex tag" checked={noIndex} onChange={(v) => { setNoIndex(v); markUnsaved() }} />
              </Section>
              <Section title="SEO checklist" hint="Rough guidance, not a hard requirement">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-[#9e9fa0] uppercase tracking-wider">Score</span>
                  <span className={`text-lg font-bold tabular-nums ${seoScore >= 70 ? 'text-emerald-600' : seoScore >= 40 ? 'text-amber-600' : 'text-[#c0483d]'}`}>{seoScore}%</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {seoChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}
                </div>
              </Section>
            </>
          )}

          {activeTab === 'accessibility' && (
            <>
              <Section title="Accessibility checklist" icon={Accessibility}>
                <div className="flex flex-col gap-2.5">
                  {a11yChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}
                </div>
              </Section>
              <Section title="Formats" icon={Layout}>
                <Toggle label="AMP version" description="Publish a lightweight, accelerated version" checked={ampEnabled} onChange={(v) => { setAmpEnabled(v); markUnsaved() }} />
              </Section>
            </>
          )}

          {activeTab === 'tags' && (
            <>
              <Section title="Tags" icon={Tag}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#c8c6c6]" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      placeholder="Add a tag…"
                      className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-xl pl-8 pr-3 py-2 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none placeholder-[#c8c6c6] transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-white border border-[#e4e2e1] rounded-xl text-xs font-semibold text-[#585f64]">
                        #{t}
                        <button onClick={() => removeTag(t)} className="text-[#c8c6c6] hover:text-[#c0483d] transition-colors">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#b8b9ba]">No tags yet.</p>
                )}
              </Section>
              <Section title="Badges" icon={Star} hint="Highlight this article in listings">
                <Toggle label="Featured" description="Show in featured rail" checked={featured} onChange={(v) => { setFeatured(v); markUnsaved() }} />
                <Toggle label="Breaking" description="Mark as breaking news" checked={breaking} onChange={(v) => { setBreaking(v); markUnsaved() }} />
                <Toggle label="Trending" description="Mark as trending" checked={trending} onChange={(v) => { setTrending(v); markUnsaved() }} />
              </Section>
            </>
          )}

          {activeTab === 'distribution' && (
            <>
              <Section title="Visibility" icon={Share2}>
                <SelectField
                  label="Who can see this"
                  value={visibility}
                  onChange={(v) => { setVisibility(v as Visibility); markUnsaved() }}
                  options={[
                    { value: 'public', label: 'Public' },
                    { value: 'unlisted', label: 'Unlisted (link only)' },
                    { value: 'private', label: 'Private' },
                  ]}
                />
                <SelectField
                  label="Status"
                  value={status}
                  onChange={(v) => { setStatus(v as ArticleStatus); markUnsaved() }}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'published', label: 'Published' },
                  ]}
                />
                {status === 'scheduled' && (
                  <div className="flex flex-col gap-1.5">
                    <SidebarLabel>Publish at</SidebarLabel>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => { setScheduledAt(e.target.value); markUnsaved() }}
                      className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-xl px-3 py-2 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                )}
              </Section>
              <Section title="Engagement" icon={Settings}>
                <Toggle label="Allow comments" checked={allowComments} onChange={(v) => { setAllowComments(v); markUnsaved() }} />
                <Toggle label="Include in RSS feed" checked={showInRss} onChange={(v) => { setShowInRss(v); markUnsaved() }} />
              </Section>
              <Section title="Share to" hint="Cross-post once published">
                <div className="flex flex-wrap gap-2">
                  {[Twitter, Facebook, Instagram, Youtube, Github, Box].map((Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      title="Coming soon"
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-[#e4e2e1] text-[#7a8086] hover:text-[#313334] hover:border-[#585f64] transition-colors"
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-[#1a1b1c]">
      <Header />

      {/* Top nav bar */}
      <header className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center justify-between px-6 py-3 gap-4">

          {/* Breadcrumb */}
          <div className="flex items-center gap-3 text-sm text-slate-400 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-none">
              <Highlighter size={16} />
            </div>
            <span className="hidden md:inline font-bold uppercase tracking-widest text-[10px] text-slate-300">Editor</span>
            <ChevronRight size={14} className="hidden md:inline shrink-0 text-slate-200" />
            <span className="text-slate-900 font-bold truncate max-w-[200px]">{title || 'Untitled Story'}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Save indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <span className={`w-2 h-2 rounded-xl shrink-0 ${
                saveStatus === 'saving' ? 'bg-amber-400 animate-pulse shadow-none' :
                saveStatus === 'unsaved' ? 'bg-rose-400' :
                'bg-emerald-500 shadow-none'
              }`} />
              <span className="whitespace-nowrap tracking-wider uppercase">{saveLabel()}</span>
            </div>

            {/* View mode switcher */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 ml-2 shadow-none">
              {((['write', 'split', 'preview'] as ViewMode[]).filter(m => isDesktop || m !== 'split')).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  title={m}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 ${
                    viewMode === m
                      ? 'bg-white text-slate-900 shadow-none ring-1 ring-slate-200/50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className="hidden md:inline capitalize tracking-tight">{m}</span>
                  <span className="md:hidden">
                    {m === 'write' ? <PenTool size={14} /> :
                     m === 'preview' ? <Eye size={14} /> :
                     <Columns2 size={14} />}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />

            {/* Sidebar toggle */}
            <button
              title="Toggle settings panel"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden xl:flex p-2.5 rounded-xl transition-all duration-300 ${
                sidebarOpen ? 'bg-slate-900 text-white shadow-none' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <PanelLeft size={18} />
            </button>
            <button
              title="Article settings"
              onClick={() => setMobileDrawerOpen(true)}
              className="xl:hidden p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <SlidersHorizontal size={18} />
            </button>

            {/* Publish button */}
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!title.trim() || !content.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black active:scale-95 transition-all shadow-none disabled:opacity-40 disabled:shadow-none"
            >
              <Send size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline tracking-tight">Publish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Full-width settings panel (desktop) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden xl:block fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="hidden xl:flex fixed left-0 right-0 top-[65px] bottom-0 z-50 bg-white flex-col shadow-2xl"
            >
              {renderSidebarPanel({ wide: true, onClose: () => setSidebarOpen(false) })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100dvh - 65px)' }}>

        {/* Editor area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50/30">

          {/* Toolbar */}
          <div className="flex items-center z-20 px-4 py-2 bg-white/80 backdrop-blur-md border-b border-gray-100 overflow-visible shrink-0 gap-1">
            <div className="flex items-center overflow-x-auto no-scrollbar gap-1 flex-1" style={{ scrollbarWidth: 'none' }}>
                <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-0.5">
                  <ToolbarBtn icon={Bold} label="Bold" onClick={() => insertMarkdown('**', '**', 'bold text')} />
                  <ToolbarBtn icon={Italic} label="Italic" onClick={() => insertMarkdown('*', '*', 'italic text')} />
                  <ToolbarBtn icon={Strikethrough} label="Strikethrough" onClick={() => insertMarkdown('~~', '~~', 'strikethrough')} />
                  <ToolbarBtn icon={Code} label="Inline Code" onClick={() => insertMarkdown('`', '`', 'code')} />
                </div>

                <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-0.5 ml-1">
                  <ToolbarBtn icon={Heading1} label="Heading 1" onClick={() => insertLinePrefix('# ')} />
                  <ToolbarBtn icon={Heading2} label="Heading 2" onClick={() => insertLinePrefix('## ')} />
                  <ToolbarBtn icon={Heading3} label="Heading 3" onClick={() => insertLinePrefix('### ')} />
                </div>

                <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-0.5 ml-1">
                  <ToolbarBtn icon={List} label="Bullet List" onClick={() => insertLinePrefix('- ')} />
                  <ToolbarBtn icon={ListOrdered} label="Numbered List" onClick={() => insertLinePrefix('1. ')} />
                  <ToolbarBtn icon={Quote} label="Blockquote" onClick={() => insertLinePrefix('> ')} />
                </div>

                <div className="flex items-center bg-gray-50 rounded-xl p-1 gap-0.5 ml-1">
                  <ToolbarBtn icon={Link} label="Link" onClick={() => insertMarkdown('[', '](url)', 'link text')} />
                  <ToolbarBtn icon={ImageIcon} label="Image" onClick={() => insertMarkdown('![', '](url)', 'alt text')} />
                  <ToolbarBtn icon={Minus} label="Divider" onClick={() => insertMarkdown('\n---\n')} />
                </div>

                {/* Mobile undo/redo */}
                <div className="sm:hidden flex items-center bg-gray-50 rounded-xl p-1 gap-0.5 ml-1">
                  <button onClick={undo} disabled={historyIndex <= 0} title="Undo" className="p-2 text-slate-400 rounded-xl disabled:opacity-30"><RotateCcw size={14} /></button>
                  <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="p-2 text-slate-400 rounded-xl disabled:opacity-30"><RotateCw size={14} /></button>
                </div>
              </div>

              {/* Block Search */}
              <div className="relative ml-1" ref={blockSearchRef}>
                <button
                  onClick={() => setBlockSearchOpen(!blockSearchOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    blockSearchOpen
                      ? 'bg-slate-900 text-white shadow-none'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <SquarePlus size={16} />
                  <span className="hidden sm:inline">Blocks</span>
                  <ChevronDown size={14} className={`transition-transform duration-300 ${blockSearchOpen ? 'rotate-180' : ''}`} />
                </button>

                {blockSearchOpen && (
                  <BlockSearchPanel
                    blocks={allBlocks}
                    onInsert={handleBlockInsert}
                    onClose={() => setBlockSearchOpen(false)}
                  />
                )}
              </div>

              <div className="hidden lg:flex items-center gap-2 ml-4 px-4 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="flex h-1.5 w-1.5 rounded-xl bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                  {countWords(content).toLocaleString()} WORDS
                </span>
              </div>
            </div>

          {/* Editor / Preview panels */}
          <div className="flex-1 overflow-hidden flex min-w-0">

            {/* Write panel */}
            {(viewMode === 'write' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-[#eeecec]' : 'w-full'} overflow-y-auto min-w-0`}>
                <div className="mx-auto px-5 sm:px-10 py-10 sm:py-14 flex flex-col gap-6 w-full max-w-3xl">

                  {/* Cover image */}
                  {coverImage && (
                    <div className="relative rounded-xl overflow-hidden aspect-video group">
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => setCoverImage('')}
                          className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl text-xs font-semibold text-[#1a1b1c] hover:bg-white transition-colors"
                        >
                          Remove cover
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 flex-wrap">
                      {breaking && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-bold uppercase tracking-wide"><Zap size={8} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-wide"><Star size={8} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-wide"><TrendingUp size={8} /> Trending</span>}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <textarea
                      ref={titleRef}
                      className="w-full border-none bg-transparent font-['Newsreader'] text-4xl sm:text-5xl font-bold p-0 focus:ring-0 placeholder-[#e8e7ea] resize-none overflow-hidden leading-[1.15] outline-none text-[#1a1b1c] tracking-tight"
                      placeholder="Article title…"
                      rows={1}
                      value={title}
                      onChange={e => { setTitle(e.target.value); markUnsaved() }}
                    />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-[#b8b9ba]">
                      {author && <span className="font-semibold text-[#9e9fa0]">{author}</span>}
                      {category && <span className="uppercase tracking-wider">{category}</span>}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        ~{estimateReadTime(content)} min read
                      </span>
                      {tags.slice(0, 3).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-[#f5f3f3] text-[#9e9fa0] rounded-xl text-[9px] font-semibold uppercase tracking-wider">#{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Editor */}
                  <CodeMirror
                    ref={editorRef}
                    value={content}
                    onChange={handleContentChange}
                    extensions={[
                      markdown({ base: markdownLanguage, codeLanguages: languages }),
                      EditorView.lineWrapping,
                      markdownTheme,
                      customBlockHighlight,
                      autocompletion({ override: [customBlockCompletions] })
                    ]}
                    basicSetup={{
                      lineNumbers: false,
                      foldGutter: false,
                      dropCursor: false,
                      allowMultipleSelections: false,
                      indentOnInput: false,
                      highlightActiveLine: true,
                      highlightSelectionMatches: false,
                      completionKeymap: true
                    }}
                    className={`${slabo.className} w-full min-h-[400px] outline-none`}
                    placeholder={`Start writing… Markdown is supported.\n\n# Use headings\n**Bold**, *italic*, \`code\`\n- Lists work too\n> Blockquotes for impact`}
                  />
                </div>
              </div>
            )}

            {/* Preview panel */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto bg-white min-w-0`}>
                <div className="mx-auto px-5 sm:px-10 py-10 sm:py-14 w-full max-w-3xl">
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {breaking && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-bold uppercase tracking-wide"><Zap size={8} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[10px] font-bold uppercase tracking-wide"><Star size={8} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-wide"><TrendingUp size={8} /> Trending</span>}
                    </div>
                  )}
                  {coverImage && (
                    <figure className="mb-8 rounded-xl overflow-hidden">
                      <img src={coverImage} alt="Cover" className="w-full object-cover max-h-72" />
                    </figure>
                  )}
                  {title && (
                    <h1 className="font-['Newsreader'] text-4xl sm:text-5xl font-bold text-[#1a1b1c] leading-[1.15] mb-5 tracking-tight">{title}</h1>
                  )}
                  {(author || category) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-8 text-xs text-[#b8b9ba] pb-6 border-b border-[#f0eeee]">
                      {author && <span className="font-semibold text-[#9e9fa0]">{author}</span>}
                      {category && <span className="uppercase tracking-wider">{category}</span>}
                      <span className="flex items-center gap-1"><Clock size={10} />~{estimateReadTime(content)} min read</span>
                    </div>
                  )}
                  <MarkdownPreview content={content} dbBlocks={dbBlocks} />
                  {tags.length > 0 && (
                    <div className="flex gap-2 mt-10 pt-6 border-t border-[#f0eeee] flex-wrap">
                      {tags.map(t => (
                        <span key={t} className="px-3 py-1.5 bg-[#f5f3f3] text-[#7a8086] rounded-xl text-xs font-semibold">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] xl:hidden"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-x-0 bottom-0 top-16 z-[70] bg-white flex flex-col shadow-2xl xl:hidden overflow-hidden rounded-t-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#eeecec] bg-white shrink-0">
                <h2 className="font-['Newsreader'] text-[15px] font-bold text-[#1a1b1c]">Article Settings</h2>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 hover:bg-[#f0eeee] rounded-xl transition-colors text-[#9e9fa0] hover:text-[#313334]"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {renderSidebarPanel({ onClose: () => setMobileDrawerOpen(false) })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Publish modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-xl shadow-none w-full sm:max-w-[480px] overflow-hidden border border-white/20 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Pill handle (mobile) */}
            <div className="flex justify-center pt-5 pb-1 sm:hidden">
              <div className="w-12 h-1.5 rounded-xl bg-slate-100" />
            </div>

            <div className="px-8 pt-8 pb-6 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-none">
                <Sparkles size={32} />
              </div>
              <h3 className="font-['Newsreader'] text-3xl font-bold text-slate-900 tracking-tight">Ready to publish?</h3>
              <p className="text-slate-500 mt-2 text-sm">Fine-tune the final details before going live.</p>
            </div>

            <div className="px-8 pb-8 flex flex-col gap-6">
              {/* Article summary */}
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100/50">
                <p className="text-lg font-bold text-slate-900 line-clamp-2 leading-tight font-['Newsreader'] tracking-tight">{title || 'Untitled Article'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Clock size={12} className="text-slate-400" />
                    ~{estimateReadTime(content)} MIN READ
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <Layout size={12} className="text-slate-400" />
                    {category || 'Uncategorized'}
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3 px-2">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-xl flex items-center justify-center ${!!title.trim() ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Catchy headline</span>
                  </div>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-xl flex items-center justify-center ${!!content.trim() ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Polished content</span>
                  </div>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-xl flex items-center justify-center ${seoScore >= 50 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-sm font-medium text-slate-600">Search optimization ({seoScore}%)</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-4 rounded-xl bg-slate-50 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
                >
                  Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex-[2] py-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 shadow-none"
                >
                  {publishing
                    ? <><Loader2 size={16} className="animate-spin" /> Publishing…</>
                    : <><Send size={16} /> Confirm & Publish</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default EditorPage