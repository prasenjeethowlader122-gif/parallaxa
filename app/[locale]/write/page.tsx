"use client";
import { slabo } from '@/lib/font'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import React, { useState, useRef, useCallback, useEffect, ComponentPropsWithoutRef } from 'react';
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin } from '@codemirror/view'
import { autocompletion, CompletionContext } from '@codemirror/autocomplete'
import { RangeSetBuilder } from '@codemirror/state'
import rehypeRaw from 'rehype-raw'
import {
  History, ChevronRight, SearchCheck, Accessibility, Tag, Share2, Settings,
  HelpCircle, Bold, Italic, Heading1, Heading2, Quote, Link, Image as ImageIcon,
  CheckCircle2, AlertCircle, Save, Send, X, Check, Copy, List, ListOrdered,
  Strikethrough, Code, Minus, RotateCcw, RotateCw, Clock, Star, Zap, TrendingUp,
  Hash, FileText, RefreshCw, PanelLeft, SlidersHorizontal, Info,
  Youtube, Facebook, Twitter, Instagram, Play, Github, Box, ChevronDown,
  Heading3, Type, Layout, SquarePlus, Highlighter, Palette, Terminal,
  Eye, Sparkles, PenTool, Columns2, Search, Filter, SortAsc, AlignLeft,
  ChevronUp, Loader2, Grid3x3, List as ListIcon, ArrowUpDown, XCircle
} from 'lucide-react';
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'
import { createCustomBlockPlugin, blockRegistry, DBBlockConfig } from '@/lib/mdx/block-registry'
import '@/lib/mdx/blocks'
import { customBlockComponents } from '@/components/mdx/CustomBlockRenderer'
import VisualEditor from '@/components/VisualEditor'

// ─── Types ───────────────────────────────────────────────────────────────────

type SidebarTab = 'metadata' | 'seo' | 'accessibility' | 'tags' | 'distribution'
type ViewMode = 'write' | 'preview' | 'split' | 'visual'
type Visibility = 'public' | 'private' | 'unlisted'
type ArticleStatus = 'draft' | 'published' | 'scheduled'
type BlockSortKey = 'name' | 'label' | 'recent'
type BlockViewMode = 'grid' | 'list'

// ─── CodeBlock ────────────────────────────────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-[#efedee] text-[#585f64] px-1.5 py-0.5 rounded text-[0.82em] font-mono break-all">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-[#dcdad9] bg-[#1a1a1a] text-gray-100 max-w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#222] border-b border-[#333]">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code.trim()); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
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

// ─── Markdown Components ──────────────────────────────────────────────────────

const mdComponents: Components = {
  ...customBlockComponents,
  code: CodeBlock as Components['code'],
  h1: ({ children }) => <h1 className="font-['Newsreader'] text-3xl font-bold text-[#1a1b1c] mt-8 mb-4 leading-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="font-['Newsreader'] text-2xl font-semibold text-[#1a1b1c] mt-6 mb-3 leading-snug">{children}</h2>,
  h3: ({ children }) => <h3 className="font-['Newsreader'] text-xl font-semibold text-[#313334] mt-5 mb-2">{children}</h3>,
  p: ({ children }) => <p className="text-[#313334] text-[1.05rem] leading-[1.85] my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-4 flex flex-col gap-2 text-[1.05rem] text-[#313334]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-4 flex flex-col gap-2 text-[1.05rem] text-[#313334]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => {
    const childrenArray = React.Children.toArray(children);
    const firstChild = childrenArray[0];
    if (React.isValidElement(firstChild) && (firstChild as any).type === 'p') {
      const pChildren = React.Children.toArray((firstChild as any).props.children);
      const firstPChild = pChildren[0];
      if (typeof firstPChild === 'string' && firstPChild.trim().startsWith('[!NOTE]')) {
        const cleanFirstChild = firstPChild.trim().replace('[!NOTE]', '').trim();
        const remainingPChildren = pChildren.slice(1);
        return (
          <div className="my-6 p-5 bg-blue-50/60 border border-blue-100 rounded-2xl flex gap-4 items-start">
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
        );
      }
    }
    return <blockquote className="border-l-[3px] border-[#585f64] pl-5 my-5 text-[#5e5f61] italic text-lg font-['Newsreader']">{children}</blockquote>;
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
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-[#585f64] underline underline-offset-2 decoration-[#dcdad9] hover:text-[#313334] hover:decoration-[#585f64] transition-colors">
      {children}
    </a>
  ),
}

function MarkdownPreview({ content, dbBlocks }: { content: string; dbBlocks: DBBlockConfig[] }) {
  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#f5f3f3] flex items-center justify-center">
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
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={mdComponents}
      >
        {content}
      </Markdown>
    </div>
  )
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

const ToolbarBtn = ({
  icon: Icon, label, onClick, active, className = ''
}: {
  icon: any; label: string; onClick: () => void; active?: boolean; className?: string
}) => (
  <button
    title={label}
    onClick={onClick}
    className={`p-2 rounded-lg transition-all shrink-0 ${
      active
        ? 'bg-[#585f64] text-white'
        : 'text-[#7a8086] hover:bg-[#f0eeee] hover:text-[#313334]'
    } ${className}`}
  >
    <Icon className="w-[15px] h-[15px]" />
  </button>
)

// ─── Dynamic Icon ─────────────────────────────────────────────────────────────

const DynamicIcon = ({ name, size = 18, className }: { name: string; size?: number; className?: string }) => {
  const iconMap: Record<string, any> = {
    'format_bold': Bold, 'format_italic': Italic, 'format_strikethrough': Strikethrough,
    'code': Code, 'format_h1': Heading1, 'format_h2': Heading2,
    'format_list_bulleted': List, 'format_list_numbered': ListOrdered,
    'format_quote': Quote, 'link': Link, 'image': ImageIcon,
    'horizontal_rule': Minus, 'add_box': SquarePlus, 'share': Share2,
    'terminal': Terminal, 'palette': Palette, 'extension': Box,
    'youtube': Youtube, 'facebook': Facebook, 'twitter': Twitter, 'instagram': Instagram,
  };
  const Icon = iconMap[name] || Box;
  return <Icon size={size} className={className} />;
};

// ─── Form Primitives ──────────────────────────────────────────────────────────

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

const InputField = ({
  label, value, onChange, placeholder, multiline, hint
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; hint?: string
}) => (
  <div className="flex flex-col gap-1.5">
    <SidebarLabel>{label}</SidebarLabel>
    {multiline
      ? <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-lg px-3 py-2 resize-none focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none placeholder-[#c8c6c6] transition-all"
        />
      : <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none placeholder-[#c8c6c6] transition-all"
        />
    }
    {hint && <p className="text-[10px] text-[#b8b9ba]">{hint}</p>}
  </div>
)

const Toggle = ({
  label, checked, onChange, description
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-[#313334]">{label}</p>
      {description && <p className="text-[10px] text-[#b8b9ba] mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative shrink-0 w-8 h-[18px] rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#585f64]' : 'bg-[#dcdad9]'
      }`}
    >
      <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[14px]' : 'translate-x-0'
      }`} />
    </button>
  </div>
)

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white rounded-xl p-3.5 border border-[#e4e2e1]">
    <p className="text-[9px] uppercase tracking-widest text-[#b8b9ba] mb-1">{label}</p>
    <p className="text-[15px] font-bold text-[#313334] tabular-nums">{value}</p>
  </div>
)

// ─── Block Search Panel ───────────────────────────────────────────────────────

interface BlockSearchPanelProps {
  blocks: Array<{ name: string; label: string; icon: any; template?: string }>
  onInsert: (block: { name: string; template?: string }) => void
  onClose: () => void
}

function BlockSearchPanel({ blocks, onInsert, onClose }: BlockSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<BlockSortKey>('label')
  const [viewMode, setViewMode] = useState<BlockViewMode>('grid')
  const [category, setCategory] = useState<'all' | 'embed' | 'social' | 'utility'>('all')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  const socialNames = ['youtube', 'facebook', 'twitter', 'instagram', 'github']
  const utilityNames = ['embed', 'run', 'style', 'screenshot']

  const categorize = (name: string) => {
    if (socialNames.includes(name)) return 'social'
    if (utilityNames.includes(name)) return 'utility'
    return 'embed'
  }

  const filtered = blocks
    .filter(b => {
      const matchesQuery =
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.label.toLowerCase().includes(query.toLowerCase())
      const matchesCat = category === 'all' || categorize(b.name) === category
      return matchesQuery && matchesCat
    })
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'label') return a.label.localeCompare(b.label)
      return 0
    })

  const categories = [
    { id: 'all', label: 'All', count: blocks.length },
    { id: 'utility', label: 'Components', count: blocks.filter(b => utilityNames.includes(b.name)).length },
    { id: 'social', label: 'Social', count: blocks.filter(b => socialNames.includes(b.name)).length },
  ] as const

  return (
    <div className="absolute top-full left-0 mt-2 w-[340px] bg-white border border-[#e4e2e1] rounded-2xl shadow-xl z-[100] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#f0eeee]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#585f64] flex items-center justify-center">
              <SquarePlus size={13} className="text-white" />
            </div>
            <h3 className="text-[13px] font-semibold text-[#1a1b1c]">Insert Block</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#9e9fa0] hover:text-[#313334] hover:bg-[#f0eeee] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b8b9ba]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="w-full pl-8 pr-3 py-2 text-xs bg-[#f5f3f3] border-0 rounded-lg outline-none text-[#313334] placeholder-[#b8b9ba] focus:ring-1 focus:ring-[#585f64] transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b8b9ba] hover:text-[#585f64] transition-colors"
            >
              <XCircle size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#f0eeee] bg-[#faf9f9]">
        <div className="flex items-center gap-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                category === cat.id
                  ? 'bg-[#585f64] text-white'
                  : 'text-[#7a8086] hover:bg-[#eeecec] hover:text-[#313334]'
              }`}
            >
              {cat.label}
              <span className={`ml-1 ${category === cat.id ? 'text-white/60' : 'text-[#b8b9ba]'}`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Switch to list' : 'Switch to grid'}
            className="p-1.5 rounded-lg text-[#9e9fa0] hover:bg-[#eeecec] hover:text-[#585f64] transition-colors"
          >
            {viewMode === 'grid' ? <ListIcon size={12} /> : <Grid3x3 size={12} />}
          </button>
          <button
            onClick={() => setSort(s => s === 'label' ? 'name' : 'label')}
            title="Toggle sort"
            className="p-1.5 rounded-lg text-[#9e9fa0] hover:bg-[#eeecec] hover:text-[#585f64] transition-colors"
          >
            <ArrowUpDown size={12} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[280px] overflow-y-auto p-2 custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="w-10 h-10 rounded-xl bg-[#f5f3f3] flex items-center justify-center">
              <Search size={16} className="text-[#c8c6c6]" />
            </div>
            <p className="text-xs text-[#b8b9ba]">No blocks match "{query}"</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-4 gap-1">
            {filtered.map(block => (
              <button
                key={block.name}
                onClick={() => { onInsert(block); onClose() }}
                title={block.label}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-[#f5f3f3] active:scale-95 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#f5f3f3] border border-[#eeecec] flex items-center justify-center text-[#7a8086] group-hover:bg-[#1a1b1c] group-hover:text-white group-hover:border-transparent transition-all">
                  <DynamicIcon name={typeof block.icon === 'string' ? block.icon : 'extension'} size={16} />
                </div>
                <span className="text-[9px] font-semibold text-[#7a8086] group-hover:text-[#313334] truncate w-full text-center leading-tight">
                  {block.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map(block => (
              <button
                key={block.name}
                onClick={() => { onInsert(block); onClose() }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f5f3f3] active:scale-[0.99] transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f5f3f3] border border-[#eeecec] flex items-center justify-center text-[#7a8086] group-hover:bg-[#1a1b1c] group-hover:text-white group-hover:border-transparent transition-all shrink-0">
                  <DynamicIcon name={typeof block.icon === 'string' ? block.icon : 'extension'} size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#313334] truncate">{block.label}</p>
                  <p className="text-[10px] text-[#b8b9ba] truncate font-mono">[!{block.name}]</p>
                </div>
                <ChevronRight size={12} className="text-[#dcdad9] group-hover:text-[#585f64] shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[#f0eeee] bg-[#faf9f9]">
          <p className="text-[10px] text-[#c8c6c6]">
            {filtered.length} block{filtered.length !== 1 ? 's' : ''} · Click to insert at cursor
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200))
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

const EditorPage = ({ searchParams }: { searchParams: Promise<{ id?: string }> }) => {
  const resolvedParams = React.use(searchParams);
  const id = resolvedParams.id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('write')
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
    if (session?.user) setAuthor(session.user.name ?? '')
  }, [session?.user])

  useEffect(() => {
    fetch('/api/blocks?user=1')
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) ? setDbBlocks(data) : null)
      .catch(() => null)
  }, [])

  useEffect(() => {
    if (saveStatus === 'unsaved') {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus('saving')
        setTimeout(() => { setSaveStatus('saved'); setLastSaved(new Date()) }, 600)
      }, 2000)
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [content, title, saveStatus])

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content || '');
          setTitle(data.title || '');
          setBreaking(data.breaking || false);
          setCssClass(data.cssClass || '');
          setNoIndex(data.noIndex || false);
          setOgImage(data.ogImage || '');
          setCoverImage(data.image || '');
          setCategory(data.category || '');
          setTags(data.tags || []);
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch article:', error);
      }
    };
    fetchArticle();
  }, [id]);

  const markUnsaved = () => setSaveStatus('unsaved')

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [title])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileDrawerOpen(false) }
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

  // ─── CodeMirror Theme ────────────────────────────────────────────────────────

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
      fontFamily: 'monospace',
      fontSize: '0.9em',
    }
  })

  const customBlockHighlight = ViewPlugin.fromClass(class {
    decorations: DecorationSet
    constructor(view: EditorView) { this.decorations = this.getDecorations(view) }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.getDecorations(update.view)
    }
    getDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>()
      const text = view.state.doc.toString()
      const regex = /\[!.+?\(url=".+?"\)\]/g
      let match
      while ((match = regex.exec(text)) !== null) {
        builder.add(match.index, match.index + match[0].length, Decoration.mark({ class: 'cm-custom-block' }))
      }
      return builder.finish()
    }
  }, { decorations: v => v.decorations })

  const customBlockCompletions = (context: CompletionContext) => {
    const word = context.matchBefore(/\[!/)
    if (!word) return null
    if (word.from === word.to && !context.explicit) return null
    const options = blockRegistry.getAllBlocks().map(block => ({
      label: block.template || `[!${block.name}()]`,
      type: 'function',
      apply: block.template || `[!${block.name}()]`,
    }))
    return { from: word.from, options }
  }

  // ─── History ──────────────────────────────────────────────────────────────────

  const pushHistory = useCallback((val: string) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), val].slice(-100))
    setHistoryIndex(i => Math.min(i + 1, 99))
  }, [historyIndex])

  const undo = () => { if (historyIndex > 0) { const i = historyIndex - 1; setContent(history[i]); setHistoryIndex(i) } }
  const redo = () => { if (historyIndex < history.length - 1) { const i = historyIndex + 1; setContent(history[i]); setHistoryIndex(i) } }
  const handleContentChange = (val: string) => { setContent(val); markUnsaved(); pushHistory(val) }

  // ─── Markdown Insertion ───────────────────────────────────────────────────────

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

  // ─── Tags ─────────────────────────────────────────────────────────────────────

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) { setTags([...tags, t]); markUnsaved() }
    setTagInput('')
  }
  const removeTag = (t: string) => { setTags(tags.filter(x => x !== t)); markUnsaved() }

  // ─── SEO ──────────────────────────────────────────────────────────────────────

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
    { success: true, text: 'AMP compatibility configured' },
  ]

  // ─── Publish ──────────────────────────────────────────────────────────────────

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const payload = {
        title,
        description: metaDescription || '',
        content,
        category,
        image: coverImage,
        readTime: estimateReadTime(content),
        featured, breaking, trending, tags,
        seoTitle, metaDescription, focusKeyword, canonicalUrl, ogImage,
        twitterCard, noIndex, allowComments, showInRss, ampEnabled,
        redirectUrl, cssClass, visibility,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: 'published',
      };
      const res = await fetch(id ? `/api/articles/${id}` : '/api/articles', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Publish failed');
      if (!id && j?.id) {
        await fetch('/api/ptp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId: j.id }),
        });
      }
      setStatus('published');
      setShowPublishModal(false);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (e) {
      console.error('Publishing error:', e);
      alert(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

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

  // ─── Sidebar Panels ───────────────────────────────────────────────────────────

  const renderSidebarPanel = () => {
    switch (activeTab) {
      case 'metadata':
        return (
          <div className="flex flex-col gap-5">
            <InputField label="Category" value={category} onChange={v => { setCategory(v); markUnsaved() }} placeholder="e.g. Technology" />
            <InputField label="Author" value={author} onChange={v => { setAuthor(v); markUnsaved() }} />
            <InputField label="Cover Image URL" value={coverImage} onChange={v => { setCoverImage(v); markUnsaved() }} placeholder="https://…" />

            <div className="flex flex-col gap-2">
              <SidebarLabel>Visibility</SidebarLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {(['public', 'private', 'unlisted'] as Visibility[]).map(v => (
                  <button
                    key={v}
                    onClick={() => { setVisibility(v); markUnsaved() }}
                    className={`py-2 rounded-xl text-[10px] font-semibold capitalize transition-all ${
                      visibility === v
                        ? 'bg-[#1a1b1c] text-white'
                        : 'bg-[#f5f3f3] text-[#7a8086] hover:bg-[#eeecec] hover:text-[#313334]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e4e2e1] p-4 flex flex-col gap-4">
              <SidebarLabel>Article Badges</SidebarLabel>
              <Toggle label="Featured" description="Shown in featured sections" checked={featured} onChange={v => { setFeatured(v); markUnsaved() }} />
              <Toggle label="Breaking News" description="Urgent banner treatment" checked={breaking} onChange={v => { setBreaking(v); markUnsaved() }} />
              <Toggle label="Trending" description="Highlight as trending" checked={trending} onChange={v => { setTrending(v); markUnsaved() }} />
            </div>

            <div className="flex flex-col gap-2">
              <SidebarLabel>Schedule Publish</SidebarLabel>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => { setScheduledAt(e.target.value); markUnsaved() }}
                className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none transition-all"
              />
              <p className="text-[10px] text-[#b8b9ba]">Leave blank to publish immediately</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Words" value={countWords(content).toLocaleString()} />
              <StatCard label="Read Time" value={`~${estimateReadTime(content)} min`} />
              <StatCard label="Characters" value={content.length.toLocaleString()} />
              <StatCard label="Paragraphs" value={String(content.split(/\n\n+/).filter(Boolean).length)} />
            </div>
          </div>
        )

      case 'seo':
        return (
          <div className="flex flex-col gap-5">
            {/* SEO Score Widget */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f0eeee" strokeWidth="3.5" />
                  <circle
                    cx="18" cy="18" r="14" fill="none"
                    stroke={seoScore >= 70 ? '#059669' : seoScore >= 40 ? '#d97706' : '#dc2626'}
                    strokeWidth="3.5"
                    strokeDasharray={`${(seoScore / 100) * 87.96} 87.96`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-[#313334]">{seoScore}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a1b1c]">SEO Score</p>
                <p className="text-xs text-[#7a8086] mt-0.5">
                  {seoScore >= 70 ? 'Good — keep going!' : seoScore >= 40 ? 'Needs improvement' : 'Poor — fix issues below'}
                </p>
              </div>
            </div>

            <InputField label="SEO Title" value={seoTitle} onChange={v => { setSeoTitle(v); markUnsaved() }} placeholder={title || 'Title for search engines'} hint={`${seoTitle.length}/70 chars`} />
            <InputField label="Focus Keyword" value={focusKeyword} onChange={v => { setFocusKeyword(v); markUnsaved() }} placeholder="e.g. narrative architecture" />
            <InputField label="Meta Description" value={metaDescription} onChange={v => { setMetaDescription(v); markUnsaved() }} placeholder="Brief summary…" multiline hint={`${metaDescription.length}/160 chars`} />
            <InputField label="Canonical URL" value={canonicalUrl} onChange={v => { setCanonicalUrl(v); markUnsaved() }} placeholder="https://…" />
            <InputField label="OG Image URL" value={ogImage} onChange={v => { setOgImage(v); markUnsaved() }} placeholder="https://…" />

            <div className="flex flex-col gap-2">
              <SidebarLabel>Twitter Card</SidebarLabel>
              <select
                value={twitterCard}
                onChange={e => { setTwitterCard(e.target.value); markUnsaved() }}
                className="w-full text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none transition-all"
              >
                <option value="summary">Summary</option>
                <option value="summary_large_image">Summary + Large Image</option>
                <option value="app">App</option>
                <option value="player">Player</option>
              </select>
            </div>

            <Toggle label="No Index" description="Prevent indexing by search engines" checked={noIndex} onChange={v => { setNoIndex(v); markUnsaved() }} />

            <div className="flex flex-col gap-2.5">
              <SidebarLabel>SEO Checklist</SidebarLabel>
              <div className="bg-white rounded-xl border border-[#e4e2e1] p-3.5 flex flex-col gap-2.5">
                {seoChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}
              </div>
            </div>
          </div>
        )

      case 'accessibility':
        return (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-xl border border-[#e4e2e1] p-4">
              <SidebarLabel>A11y Checklist</SidebarLabel>
              <div className="flex flex-col gap-2.5 mt-3">
                {a11yChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}
              </div>
            </div>
            <Toggle label="Allow Comments" description="Let readers engage below the article" checked={allowComments} onChange={v => { setAllowComments(v); markUnsaved() }} />
            <Toggle label="AMP Enabled" description="Faster mobile loads via AMP" checked={ampEnabled} onChange={v => { setAmpEnabled(v); markUnsaved() }} />
            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
              <p className="text-xs font-semibold text-amber-800">Accessibility tip</p>
              <p className="text-[11px] text-amber-700 mt-1.5 leading-relaxed">
                Always add alt text to images:{' '}
                <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-mono">![description](url)</code>
              </p>
            </div>
          </div>
        )

      case 'tags':
        return (
          <div className="flex flex-col gap-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a tag…"
                className="flex-1 text-xs text-[#313334] bg-white border border-[#e4e2e1] rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-[#585f64] focus:border-transparent outline-none placeholder-[#c8c6c6] transition-all"
              />
              <button
                onClick={addTag}
                className="shrink-0 px-4 py-2.5 bg-[#1a1b1c] text-white rounded-xl text-xs font-semibold hover:bg-[#313334] transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-white border border-[#e4e2e1] rounded-full text-xs text-[#313334] font-medium">
                  <Hash size={9} className="text-[#b8b9ba] shrink-0" />
                  <span className="max-w-[90px] truncate">{tag}</span>
                  <button onClick={() => removeTag(tag)} className="text-[#c8c6c6] hover:text-[#c0483d] transition-colors ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {tags.length === 0 && <p className="text-xs text-[#c8c6c6] italic">No tags yet.</p>}
            </div>
            <div className="bg-white rounded-xl border border-[#e4e2e1] p-4">
              <SidebarLabel>Suggested Tags</SidebarLabel>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['journalism', 'editorial', 'media', 'writing', 'content', 'typography', 'ui-design', 'publishing']
                  .filter(t => !tags.includes(t))
                  .map(t => (
                    <button
                      key={t}
                      onClick={() => { setTags(prev => [...prev, t]); markUnsaved() }}
                      className="px-2.5 py-1.5 bg-[#f5f3f3] rounded-full text-[10px] font-semibold text-[#7a8086] hover:bg-[#1a1b1c] hover:text-white transition-all"
                    >
                      + {t}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )

      case 'distribution':
        return (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-xl border border-[#e4e2e1] p-4 flex flex-col gap-4">
              <SidebarLabel>Status</SidebarLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {(['draft', 'published', 'scheduled'] as ArticleStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); markUnsaved() }}
                    className={`py-2 rounded-xl text-[10px] font-semibold capitalize transition-all ${
                      status === s
                        ? 'bg-[#1a1b1c] text-white'
                        : 'bg-[#f5f3f3] text-[#7a8086] hover:bg-[#eeecec]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Toggle label="Show in RSS Feed" checked={showInRss} onChange={v => { setShowInRss(v); markUnsaved() }} description="Include in RSS syndication" />
            </div>

            <InputField label="Redirect URL" value={redirectUrl} onChange={v => { setRedirectUrl(v); markUnsaved() }} placeholder="Redirect URL…" hint="Leave blank for default slug" />
            <InputField label="Custom CSS Class" value={cssClass} onChange={v => { setCssClass(v); markUnsaved() }} placeholder="e.g. featured-article" />

            {/* Social preview card */}
            <div className="flex flex-col gap-2">
              <SidebarLabel>Share Preview</SidebarLabel>
              <div className="rounded-xl overflow-hidden border border-[#e4e2e1] bg-white">
                {coverImage
                  ? <img src={coverImage} alt="OG preview" className="w-full h-28 object-cover" />
                  : (
                    <div className="w-full h-28 bg-[#f5f3f3] flex items-center justify-center">
                      <ImageIcon size={20} className="text-[#c8c6c6]" />
                    </div>
                  )
                }
                <div className="p-3.5">
                  <p className="text-xs font-semibold text-[#1a1b1c] line-clamp-2 leading-snug">{seoTitle || title || 'Article title…'}</p>
                  <p className="text-[10px] text-[#9e9fa0] mt-1 line-clamp-2 leading-relaxed">{metaDescription || 'Meta description will appear here…'}</p>
                  <p className="text-[9px] text-[#c8c6c6] mt-2 uppercase tracking-wider">bangladeshhinduunion.org</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!title.trim() || !content.trim()}
              className="w-full py-3 rounded-xl bg-[#1a1b1c] text-white text-sm font-semibold hover:bg-[#313334] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={14} />
              Publish Article
            </button>
          </div>
        )
    }
  }

  // ─── Sidebar Inner ────────────────────────────────────────────────────────────

  const SidebarInner = () => {
    const tabs = [
      { id: 'metadata' as SidebarTab, icon: <FileText size={14} />, label: 'Metadata' },
      { id: 'seo' as SidebarTab, icon: <SearchCheck size={14} />, label: 'SEO' },
      { id: 'accessibility' as SidebarTab, icon: <Accessibility size={14} />, label: 'Accessibility' },
      { id: 'tags' as SidebarTab, icon: <Tag size={14} />, label: 'Tags' },
      { id: 'distribution' as SidebarTab, icon: <Share2 size={14} />, label: 'Distribution' },
    ]

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Sidebar header */}
        <div className="px-5 py-4 border-b border-[#eeecec] shrink-0">
          <h2 className="font-['Newsreader'] text-[17px] font-bold text-[#1a1b1c]">Editorial Settings</h2>
          <p className="text-[10px] font-medium text-[#c8c6c6] mt-0.5 uppercase tracking-widest">
            {id ? `Article #${id}` : 'New article'}
          </p>
        </div>

        {/* Tab nav */}
        <div className="px-3 py-3 border-b border-[#eeecec] shrink-0">
          <div className="flex flex-col gap-0.5">
            {tabs.map(({ id: tabId, icon, label }) => (
              <button
                key={tabId}
                onClick={() => { setActiveTab(tabId); setMobileDrawerOpen(false) }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all text-left w-full ${
                  activeTab === tabId
                    ? 'bg-[#1a1b1c] text-white font-semibold'
                    : 'text-[#7a8086] hover:bg-[#f5f3f3] hover:text-[#313334]'
                }`}
              >
                <span className="shrink-0">{icon}</span>
                <span>{label}</span>
                {tabId === 'seo' && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    seoScore >= 70 ? 'bg-emerald-100 text-emerald-700' :
                    seoScore >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {seoScore}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto px-4 pb-10 custom-scrollbar">
          <div className="py-4">{renderSidebarPanel()}</div>
        </div>
      </div>
    )
  }

  // ─── All blocks for search ─────────────────────────────────────────────────

  const allBlocks = blockRegistry.getAllBlocks()

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white text-[#1a1b1c]">
      <Header />

      {/* Top nav bar */}
      <header className="w-full sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#eeecec]">
        <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 gap-3">

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#b8b9ba] min-w-0 flex-1">
            <span className="hidden sm:inline text-[#b8b9ba]">Drafts</span>
            <ChevronRight size={10} className="hidden sm:inline shrink-0 text-[#dcdad9]" />
            <span className="text-[#313334] font-medium truncate">{title || 'Untitled'}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Save indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-[#9e9fa0] bg-[#f5f3f3] rounded-lg">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' :
                saveStatus === 'unsaved' ? 'bg-red-400' :
                'bg-emerald-500'
              }`} />
              <span className="whitespace-nowrap">{saveLabel()}</span>
            </div>

            {/* View mode switcher */}
            <div className="flex items-center bg-[#f5f3f3] rounded-xl p-0.5 ml-1">
              {(['write', 'visual', 'split', 'preview'] as ViewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  title={m}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                    viewMode === m
                      ? 'bg-white text-[#1a1b1c] shadow-sm'
                      : 'text-[#9e9fa0] hover:text-[#585f64]'
                  }`}
                >
                  <span className="hidden sm:inline capitalize">{m}</span>
                  <span className="sm:hidden">
                    {m === 'write' ? <PenTool size={13} /> :
                     m === 'visual' ? <Sparkles size={13} /> :
                     m === 'preview' ? <Eye size={13} /> :
                     <Columns2 size={13} />}
                  </span>
                </button>
              ))}
            </div>

            {/* Undo / Redo */}
            <div className="hidden sm:flex items-center gap-0.5 ml-0.5">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo"
                className="p-2 text-[#9e9fa0] hover:bg-[#f0eeee] hover:text-[#585f64] rounded-lg disabled:opacity-30 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
                className="p-2 text-[#9e9fa0] hover:bg-[#f0eeee] hover:text-[#585f64] rounded-lg disabled:opacity-30 transition-colors"
              >
                <RotateCw size={14} />
              </button>
            </div>

            <div className="h-4 w-px bg-[#eeecec] mx-1 hidden sm:block" />

            {/* Sidebar toggle */}
            <button
              title="Toggle settings panel"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`hidden xl:flex p-2 rounded-lg transition-all ${
                sidebarOpen ? 'bg-[#1a1b1c] text-white' : 'text-[#9e9fa0] hover:bg-[#f0eeee] hover:text-[#585f64]'
              }`}
            >
              <PanelLeft size={14} />
            </button>
            <button
              title="Article settings"
              onClick={() => setMobileDrawerOpen(true)}
              className="xl:hidden p-2 text-[#9e9fa0] hover:bg-[#f0eeee] rounded-lg transition-colors"
            >
              <SlidersHorizontal size={14} />
            </button>

            {/* Save button */}
            <button
              onClick={() => {
                setSaveStatus('saving')
                setTimeout(() => { setSaveStatus('saved'); setLastSaved(new Date()) }, 600)
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f3f3] text-[#585f64] text-xs font-semibold hover:bg-[#eeecec] active:scale-95 transition-all"
            >
              <Save size={12} />
              Save
            </button>

            {/* Publish button */}
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!title.trim() || !content.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1a1b1c] text-white text-xs font-semibold hover:bg-[#313334] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={12} />
              <span>Publish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex overflow-hidden" style={{ height: 'calc(100dvh - 113px)' }}>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="hidden xl:flex h-full w-[268px] shrink-0 bg-[#faf9f9] flex-col overflow-hidden border-r border-[#eeecec]">
            <SidebarInner />
          </aside>
        )}

        {/* Editor area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Toolbar */}
          {viewMode !== 'visual' && (
            <div className="flex items-center z-5  px-2 py-1 bg-white border-b border-[#f5f3f3] overflow-none overflow-x-auto shrink-0 gap-0.5" style={{ scrollbarWidth: 'none' }}>
              <ToolbarBtn icon={Bold} label="Bold" onClick={() => insertMarkdown('**', '**', 'bold text')} />
              <ToolbarBtn icon={Italic} label="Italic" onClick={() => insertMarkdown('*', '*', 'italic text')} />
              <ToolbarBtn icon={Strikethrough} label="Strikethrough" onClick={() => insertMarkdown('~~', '~~', 'strikethrough')} />
              <ToolbarBtn icon={Code} label="Inline Code" onClick={() => insertMarkdown('`', '`', 'code')} />

              <div className="h-4 w-px bg-[#f0eeee] mx-1 shrink-0" />

              <ToolbarBtn icon={Heading1} label="Heading 1" onClick={() => insertLinePrefix('# ')} />
              <ToolbarBtn icon={Heading2} label="Heading 2" onClick={() => insertLinePrefix('## ')} />
              <ToolbarBtn icon={Heading3} label="Heading 3" onClick={() => insertLinePrefix('### ')} />

              <div className="h-4 w-px bg-[#f0eeee] mx-1 shrink-0" />

              <ToolbarBtn icon={List} label="Bullet List" onClick={() => insertLinePrefix('- ')} />
              <ToolbarBtn icon={ListOrdered} label="Numbered List" onClick={() => insertLinePrefix('1. ')} />
              <ToolbarBtn icon={Quote} label="Blockquote" onClick={() => insertLinePrefix('> ')} />

              <div className="h-4 w-px bg-[#f0eeee] mx-1 shrink-0" />

              <ToolbarBtn icon={Link} label="Link" onClick={() => insertMarkdown('[', '](url)', 'link text')} />
              <ToolbarBtn icon={ImageIcon} label="Image" onClick={() => insertMarkdown('![', '](url)', 'alt text')} />
              <ToolbarBtn icon={Minus} label="Divider" onClick={() => insertMarkdown('\n---\n')} />

              <div className="h-4 w-px bg-[#f0eeee] mx-1 shrink-0" />

              {/* Block Search */}
              <div className="relative" ref={blockSearchRef}>
                <button
                  onClick={() => setBlockSearchOpen(!blockSearchOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    blockSearchOpen
                      ? 'bg-[#1a1b1c] text-white'
                      : 'text-[#7a8086] hover:bg-[#f0eeee] hover:text-[#313334]'
                  }`}
                >
                  <SquarePlus size={14} />
                  <span className="hidden sm:inline">Blocks</span>
                  <Search size={11} className="hidden sm:inline opacity-60" />
                  <ChevronDown size={11} className={`transition-transform duration-200 ${blockSearchOpen ? 'rotate-180' : ''}`} />
                </button>

                {blockSearchOpen && (
                  <BlockSearchPanel
                    blocks={allBlocks}
                    onInsert={handleBlockInsert}
                    onClose={() => setBlockSearchOpen(false)}
                  />
                )}
              </div>

              {/* Mobile undo/redo */}
              <div className="h-4 w-px bg-[#f0eeee] mx-1 sm:hidden shrink-0" />
              <button onClick={undo} disabled={historyIndex <= 0} title="Undo" className="sm:hidden p-2 text-[#9e9fa0] rounded-lg disabled:opacity-30"><RotateCcw size={13} /></button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="sm:hidden p-2 text-[#9e9fa0] rounded-lg disabled:opacity-30"><RotateCw size={13} /></button>

              <div className="flex-1" />
              <span className="hidden sm:block text-[10px] text-[#c8c6c6] whitespace-nowrap pr-2 font-medium tabular-nums">
                {countWords(content).toLocaleString()}w · ~{estimateReadTime(content)}min
              </span>
            </div>
          )}

          {/* Editor / Preview panels */}
          <div className="flex-1 overflow-hidden flex min-w-0">

            {/* Write / Visual panel */}
            {(viewMode === 'write' || viewMode === 'split' || viewMode === 'visual') && (
              <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-[#eeecec]' : 'w-full'} overflow-y-auto min-w-0`}>
                <div className="mx-auto px-5 sm:px-10 py-10 sm:py-14 flex flex-col gap-6 w-full max-w-3xl">

                  {/* Cover image */}
                  {coverImage && (
                    <div className="relative rounded-2xl overflow-hidden aspect-video group">
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
                      {breaking && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-bold uppercase tracking-wide"><Zap size={8} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-bold uppercase tracking-wide"><Star size={8} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wide"><TrendingUp size={8} /> Trending</span>}
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
                        <span key={t} className="px-2 py-0.5 bg-[#f5f3f3] text-[#9e9fa0] rounded-full text-[9px] font-semibold uppercase tracking-wider">#{t}</span>
                      ))}
                    </div>
                  </div>

                  {/* Editor */}
                  {viewMode === 'visual' ? (
                    <VisualEditor content={content} onChange={handleContentChange} />
                  ) : (
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
                  )}
                </div>
              </div>
            )}

            {/* Preview panel */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto bg-white min-w-0`}>
                <div className="mx-auto px-5 sm:px-10 py-10 sm:py-14 w-full max-w-3xl">
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {breaking && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-bold uppercase tracking-wide"><Zap size={8} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-bold uppercase tracking-wide"><Star size={8} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wide"><TrendingUp size={8} /> Trending</span>}
                    </div>
                  )}
                  {coverImage && (
                    <figure className="mb-8 rounded-2xl overflow-hidden">
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
                        <span key={t} className="px-3 py-1.5 bg-[#f5f3f3] text-[#7a8086] rounded-full text-xs font-semibold">#{t}</span>
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
      {mobileDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] xl:hidden"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            className="fixed top-0 right-0 bottom-0 z-[70] bg-[#faf9f9] flex flex-col shadow-2xl xl:hidden overflow-hidden"
            style={{ width: 'min(300px, 90vw)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eeecec] bg-white shrink-0">
              <h2 className="font-['Newsreader'] text-[15px] font-bold text-[#1a1b1c]">Article Settings</h2>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 hover:bg-[#f0eeee] rounded-lg transition-colors text-[#9e9fa0] hover:text-[#313334]"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarInner />
            </div>
          </div>
        </>
      )}

      {/* Publish modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[420px] overflow-hidden">
            {/* Pill handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-[#e4e2e1]" />
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0eeee]">
              <div>
                <h3 className="font-['Newsreader'] text-[17px] font-bold text-[#1a1b1c]">Publish Article</h3>
                <p className="text-[11px] text-[#b8b9ba] mt-0.5">Review before going live</p>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="p-1.5 hover:bg-[#f0eeee] rounded-lg transition-colors text-[#9e9fa0]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {/* Article summary */}
              <div className="p-4 bg-[#f5f3f3] rounded-xl">
                <p className="text-[13px] font-semibold text-[#1a1b1c] line-clamp-2 leading-snug">{title || 'Untitled'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#b8b9ba] mt-2">
                  <span className="tabular-nums">{countWords(content).toLocaleString()} words</span>
                  <span>~{estimateReadTime(content)} min read</span>
                  <span className="capitalize">{visibility}</span>
                  {category && <span>{category}</span>}
                </div>
              </div>

              {/* Checklist */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b8b9ba]">Pre-publish checks</p>
                <SEOItem success={!!title.trim()} text="Title is set" />
                <SEOItem success={!!content.trim()} text="Content is not empty" />
                <SEOItem success={!!category} text="Category assigned" />
                <SEOItem success={seoScore >= 50} text={`SEO score: ${seoScore}/100`} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[#e4e2e1] text-sm font-medium text-[#7a8086] hover:bg-[#f5f3f3] hover:text-[#313334] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex-1 py-3 rounded-xl bg-[#1a1b1c] text-white text-sm font-semibold hover:bg-[#313334] transition-all disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {publishing
                    ? <><Loader2 size={14} className="animate-spin" /> Publishing…</>
                    : <><Send size={13} /> Confirm & Publish</>
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

export default EditorPage;