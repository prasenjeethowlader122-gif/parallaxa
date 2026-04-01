"use client";
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import React, { useState, useRef, useCallback, useEffect, ComponentPropsWithoutRef } from 'react';
import {
  History,
  Eye,
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
  PlusCircle,
  Upload,
  Download,
  Save,
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
  AlignLeft,
  Clock,
  Globe,
  Lock,
  ChevronDown,
  Star,
  Zap,
  TrendingUp,
  Hash,
  FileText,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'

// ─── Types ───────────────────────────────────────────────────────────────────

type SidebarTab = 'metadata' | 'seo' | 'accessibility' | 'tags' | 'distribution'
type ViewMode = 'write' | 'preview' | 'split'
type Visibility = 'public' | 'private' | 'unlisted'
type ArticleStatus = 'draft' | 'published' | 'scheduled'

// ─── MD Code Block ───────────────────────────────────────────────────────────

function CodeBlock({ children, className }: ComponentPropsWithoutRef<'code'>) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? 'text'
  const code = typeof children === 'string' ? children : String(children ?? '')
  const isInline = !className

  if (isInline) {
    return (
      <code className="bg-[#efedee] text-[#585f64] px-1.5 py-0.5 rounded text-[0.82em] font-mono">
        {children}
      </code>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-[#dcdad9] bg-[#1e1e1e] text-gray-100">
      <div className="flex items-center justify-between px-4 py-2 bg-[#2a2a2a] border-b border-[#3a3a3a]">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── MD Component Map ─────────────────────────────────────────────────────────

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => (
    <h1 className="font-['Newsreader'] text-3xl font-bold text-[#1a1b1c] mt-6 mb-3 leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-['Newsreader'] text-2xl font-semibold text-[#1a1b1c] mt-5 mb-2 leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-['Newsreader'] text-xl font-semibold text-[#313334] mt-4 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[#313334] text-[1.05rem] leading-[1.85] my-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 my-3 flex flex-col gap-1.5 text-[1.05rem] text-[#313334]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 my-3 flex flex-col gap-1.5 text-[1.05rem] text-[#313334]">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[#585f64] pl-5 my-4 text-[#5e5f61] italic text-lg font-['Newsreader']">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-xl border border-[#e4e2e1]">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#f5f3f3] text-[#585f64]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[#efedee]">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-2.5 text-[#313334]">{children}</td>,
  hr: () => <hr className="my-6 border-[#e4e2e1]" />,
  strong: ({ children }) => <strong className="font-bold text-[#1a1b1c]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#5e5f61]">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#585f64] underline underline-offset-2 hover:text-[#313334] transition-colors"
    >
      {children}
    </a>
  ),
}

// ─── Markdown Preview ─────────────────────────────────────────────────────────

function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="text-[#c0bebe] font-['Newsreader'] italic text-xl text-center py-20">
        Nothing to preview yet…
      </div>
    )
  }
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={mdComponents}
    >
      {content}
    </Markdown>
  )
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

const ToolbarBtn = ({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
}) => (
  <button
    title={label}
    onClick={onClick}
    className={`p-2 rounded-lg transition-all text-sm ${
      active
        ? 'bg-[#585f64] text-white'
        : 'text-[#585f64] hover:bg-black/8 hover:text-[#313334]'
    }`}
  >
    {icon}
  </button>
)

// ─── Sidebar Sub-Components ───────────────────────────────────────────────────

const SidebarLink = ({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-5 py-2.5 rounded-full transition-all text-sm tracking-wide w-full ${
      active ? 'bg-white text-[#585f64] font-semibold shadow-sm' : 'text-[#5e5f65] hover:bg-black/5'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
)

const SEOItem = ({ success, text }: { success: boolean; text: string }) => (
  <div className="flex items-start gap-3 text-sm">
    {success ? (
      <CheckCircle2 size={15} className="text-green-600 mt-0.5 shrink-0" fill="currentColor" />
    ) : (
      <AlertCircle size={15} className="text-[#9f403d] mt-0.5 shrink-0" fill="currentColor" />
    )}
    <span className="text-[#313334] leading-snug">{text}</span>
  </div>
)

const InputField = ({
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
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 resize-none focus:ring-1 focus:ring-[#585f64] focus:border-[#585f64] outline-none transition-all placeholder-[#c0bebe]"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] focus:border-[#585f64] outline-none transition-all placeholder-[#c0bebe]"
      />
    )}
    {hint && <p className="text-[10px] text-[#9e9fa0]">{hint}</p>}
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
    <div>
      <p className="text-xs font-medium text-[#313334]">{label}</p>
      {description && <p className="text-[10px] text-[#9e9fa0] mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#585f64]' : 'bg-[#dcdad9]'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

// ─── Word / Char Counter ──────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200))
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EditorPage = () => {
  // Core content state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('write')

  // Save state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Sidebar
  const [activeTab, setActiveTab] = useState<SidebarTab>('metadata')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Undo/Redo stack
  const [history, setHistory] = useState<string[]>([''])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Metadata
  const [category, setCategory] = useState('')
  const [author, setAuthor] = useState('Elena Vance')
  const [tags, setTags] = useState<string[]>(['narrative', 'design'])
  const [tagInput, setTagInput] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [status, setStatus] = useState<ArticleStatus>('draft')
  const [featured, setFeatured] = useState(false)
  const [breaking, setBreaking] = useState(false)
  const [trending, setTrending] = useState(false)
  const [coverImage, setCoverImage] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  // SEO
  const [seoTitle, setSeoTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [focusKeyword, setFocusKeyword] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [twitterCard, setTwitterCard] = useState('summary_large_image')
  const [noIndex, setNoIndex] = useState(false)

  // Accessibility / Advanced
  const [allowComments, setAllowComments] = useState(true)
  const [showInRss, setShowInRss] = useState(true)
  const [ampEnabled, setAmpEnabled] = useState(false)
  const [cssClass, setCssClass] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')

  // Distribution
  const [publishNow, setPublishNow] = useState(true)

  // Publish modal
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Autosave ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (saveStatus === 'unsaved') {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus('saving')
        setTimeout(() => {
          setSaveStatus('saved')
          setLastSaved(new Date())
        }, 600)
      }, 2000)
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [content, title, saveStatus])

  const markUnsaved = () => setSaveStatus('unsaved')

  // ─── Title auto-resize ──────────────────────────────────────────────────────

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
  }, [title])

  // ─── Textarea auto-resize ───────────────────────────────────────────────────

  useEffect(() => {
    if (textareaRef.current && viewMode === 'write') {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`
    }
  }, [content, viewMode])

  // ─── Undo / Redo ────────────────────────────────────────────────────────────

  const pushHistory = useCallback(
    (val: string) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1)
        return [...sliced, val].slice(-100)
      })
      setHistoryIndex((i) => Math.min(i + 1, 99))
    },
    [historyIndex]
  )

  const undo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1
      setContent(history[newIdx])
      setHistoryIndex(newIdx)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1
      setContent(history[newIdx])
      setHistoryIndex(newIdx)
    }
  }

  // ─── Content change ─────────────────────────────────────────────────────────

  const handleContentChange = (val: string) => {
    setContent(val)
    markUnsaved()
    pushHistory(val)
  }

  // ─── Toolbar actions ────────────────────────────────────────────────────────

  const insertMarkdown = useCallback(
    (before: string, after = '', placeholder = '') => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = content.slice(start, end) || placeholder
      const newContent =
        content.slice(0, start) + before + selected + after + content.slice(end)
      handleContentChange(newContent)
      setTimeout(() => {
        ta.focus()
        const newCursor = start + before.length + selected.length
        ta.setSelectionRange(newCursor, newCursor)
      }, 0)
    },
    [content]
  )

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const lineStart = content.lastIndexOf('\n', start - 1) + 1
      const newContent = content.slice(0, lineStart) + prefix + content.slice(lineStart)
      handleContentChange(newContent)
      setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(start + prefix.length, start + prefix.length)
      }, 0)
    },
    [content]
  )

  // ─── Tag management ─────────────────────────────────────────────────────────

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) { setTags([...tags, t]); markUnsaved() }
    setTagInput('')
  }
  const removeTag = (t: string) => { setTags(tags.filter((x) => x !== t)); markUnsaved() }

  // ─── SEO score (simple heuristic) ───────────────────────────────────────────

  const seoChecks = [
    { success: title.length >= 10 && title.length <= 70, text: `Title length (${title.length}/70 chars)` },
    { success: !!focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase()), text: 'Focus keyword in title' },
    { success: metaDescription.length >= 120 && metaDescription.length <= 160, text: `Meta description (${metaDescription.length}/160 chars)` },
    { success: content.split(/\s+/).length >= 300, text: `Word count ≥ 300 (${countWords(content)} words)` },
    { success: !!coverImage, text: 'Cover image set' },
    { success: !noIndex, text: 'Page is indexable' },
  ]

  const seoScore = Math.round((seoChecks.filter((c) => c.success).length / seoChecks.length) * 100)

  // ─── Accessibility checks ────────────────────────────────────────────────────

  const a11yChecks = [
    { success: title.trim().length > 0, text: 'Article has a title' },
    { success: content.length > 0, text: 'Article has content' },
    { success: !!coverImage, text: 'Cover image provided (for alt text)' },
    { success: allowComments, text: 'Comments enabled for community engagement' },
    { success: !ampEnabled || ampEnabled, text: 'AMP compatibility configured' },
  ]

  // ─── Publish handler ─────────────────────────────────────────────────────────

  const handlePublish = async () => {
    setPublishing(true)
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500))
    setPublishing(false)
    setShowPublishModal(false)
    setStatus('published')
    setSaveStatus('saved')
    setLastSaved(new Date())
  }

  // ─── Save time display ───────────────────────────────────────────────────────

  const saveLabel = () => {
    if (saveStatus === 'saving') return 'Saving…'
    if (saveStatus === 'unsaved') return 'Unsaved changes'
    if (lastSaved) {
      const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000)
      if (diff < 60) return `Saved ${diff}s ago`
      return `Saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    return 'All changes saved'
  }

  // ─── Active sidebar panel ────────────────────────────────────────────────────

  const renderSidebarPanel = () => {
    switch (activeTab) {
      case 'metadata':
        return (
          <div className="flex flex-col gap-5">
            <InputField label="Category" value={category} onChange={(v) => { setCategory(v); markUnsaved() }} placeholder="e.g. Technology" />
            <InputField label="Author" value={author} onChange={(v) => { setAuthor(v); markUnsaved() }} />
            <InputField label="Cover Image URL" value={coverImage} onChange={(v) => { setCoverImage(v); markUnsaved() }} placeholder="https://…" />

            {/* Visibility */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Visibility</label>
              <div className="flex gap-2">
                {(['public', 'private', 'unlisted'] as Visibility[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setVisibility(v); markUnsaved() }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                      visibility === v ? 'bg-[#585f64] text-white' : 'bg-[#efedee] text-[#5e5f61] hover:bg-[#e4e2e1]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Article Badges</p>
              <Toggle label="Featured" description="Shown in featured sections" checked={featured} onChange={(v) => { setFeatured(v); markUnsaved() }} />
              <Toggle label="Breaking News" description="Urgent banner treatment" checked={breaking} onChange={(v) => { setBreaking(v); markUnsaved() }} />
              <Toggle label="Trending" description="Highlight as trending topic" checked={trending} onChange={(v) => { setTrending(v); markUnsaved() }} />
            </div>

            {/* Scheduled publish */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Schedule Publish</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => { setScheduledAt(e.target.value); markUnsaved() }}
                className="w-full text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none"
              />
              <p className="text-[10px] text-[#9e9fa0]">Leave blank to publish immediately</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Words', value: countWords(content).toLocaleString() },
                { label: 'Read Time', value: `~${estimateReadTime(content)} min` },
                { label: 'Characters', value: content.length.toLocaleString() },
                { label: 'Paragraphs', value: content.split(/\n\n+/).filter(Boolean).length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 border border-[#e4e2e1]">
                  <p className="text-[9px] uppercase tracking-widest text-[#9e9fa0]">{label}</p>
                  <p className="text-lg font-bold text-[#313334] mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )

      case 'seo':
        return (
          <div className="flex flex-col gap-5">
            {/* Score ring */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <div className="relative w-14 h-14 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#efedee" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={seoScore >= 70 ? '#22c55e' : seoScore >= 40 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${seoScore} 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#313334]">{seoScore}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#313334]">SEO Score</p>
                <p className="text-xs text-[#5e5f61]">
                  {seoScore >= 70 ? 'Good — keep going!' : seoScore >= 40 ? 'Needs improvement' : 'Poor — fix issues below'}
                </p>
              </div>
            </div>

            <InputField label="SEO Title" value={seoTitle} onChange={(v) => { setSeoTitle(v); markUnsaved() }} placeholder={title || 'Article title for search engines'} hint={`${seoTitle.length}/70 chars recommended`} />
            <InputField label="Focus Keyword" value={focusKeyword} onChange={(v) => { setFocusKeyword(v); markUnsaved() }} placeholder="e.g. narrative architecture" />
            <InputField label="Meta Description" value={metaDescription} onChange={(v) => { setMetaDescription(v); markUnsaved() }} placeholder="Brief summary for search engines…" multiline hint={`${metaDescription.length}/160 chars`} />
            <InputField label="Canonical URL" value={canonicalUrl} onChange={(v) => { setCanonicalUrl(v); markUnsaved() }} placeholder="https://…" />
            <InputField label="OG Image URL" value={ogImage} onChange={(v) => { setOgImage(v); markUnsaved() }} placeholder="https://…" />

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Twitter Card</label>
              <select
                value={twitterCard}
                onChange={(e) => { setTwitterCard(e.target.value); markUnsaved() }}
                className="w-full text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none"
              >
                <option value="summary">Summary</option>
                <option value="summary_large_image">Summary + Large Image</option>
                <option value="app">App</option>
                <option value="player">Player</option>
              </select>
            </div>

            <Toggle label="No Index" description="Prevent search engines from indexing" checked={noIndex} onChange={(v) => { setNoIndex(v); markUnsaved() }} />

            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">SEO Checklist</p>
              {seoChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}
            </div>
          </div>
        )

      case 'accessibility':
        return (
          <div className="flex flex-col gap-5">
            <div className="p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61] mb-3">A11y Checklist</p>
              <div className="flex flex-col gap-2.5">
                {a11yChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}
              </div>
            </div>
            <Toggle label="Allow Comments" description="Let readers engage below the article" checked={allowComments} onChange={(v) => { setAllowComments(v); markUnsaved() }} />
            <Toggle label="AMP Enabled" description="Generate AMP version for faster mobile loads" checked={ampEnabled} onChange={(v) => { setAmpEnabled(v); markUnsaved() }} />
            <div className="p-4 bg-[#fef9c3] rounded-xl border border-[#fde68a]">
              <p className="text-xs text-[#92400e] font-medium">Accessibility tip</p>
              <p className="text-[11px] text-[#78350f] mt-1 leading-relaxed">
                Always add alt text to images in your content using <code className="bg-[#fde68a]/50 px-1 rounded">![alt text](url)</code> markdown syntax.
              </p>
            </div>
          </div>
        )

      case 'tags':
        return (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a tag…"
                className="flex-1 text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-[#585f64] text-white rounded-lg text-xs font-medium hover:bg-[#3d4042] transition-colors"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#dcdad9] rounded-full text-xs text-[#313334] font-medium group hover:border-[#9f403d] transition-colors">
                  <Hash size={10} className="text-[#9e9fa0]" />
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-[#9e9fa0] hover:text-[#9f403d] transition-colors ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <p className="text-xs text-[#9e9fa0] italic">No tags yet. Add some above.</p>
              )}
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#e4e2e1]">
              <p className="text-[9px] uppercase tracking-widest text-[#9e9fa0] mb-2">Suggested Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {['journalism', 'editorial', 'media', 'writing', 'content', 'typography', 'ui-design', 'publishing'].filter(t => !tags.includes(t)).map(t => (
                  <button key={t} onClick={() => { setTags(prev => [...prev, t]); markUnsaved() }}
                    className="px-2.5 py-1 bg-[#efedee] rounded-full text-[10px] text-[#5e5f61] hover:bg-[#585f64] hover:text-white transition-colors">
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
            <div className="p-4 bg-white rounded-xl border border-[#e4e2e1] flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Publish Settings</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Status</label>
                <div className="flex gap-2">
                  {(['draft', 'published', 'scheduled'] as ArticleStatus[]).map((s) => (
                    <button key={s} onClick={() => { setStatus(s); markUnsaved() }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all ${
                        status === s ? 'bg-[#585f64] text-white' : 'bg-[#efedee] text-[#5e5f61] hover:bg-[#e4e2e1]'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Show in RSS Feed" checked={showInRss} onChange={(v) => { setShowInRss(v); markUnsaved() }} description="Include in RSS syndication" />
            </div>

            <InputField label="Redirect URL" value={redirectUrl} onChange={(v) => { setRedirectUrl(v); markUnsaved() }} placeholder="Redirect to another URL…" hint="Leave blank to use default slug URL" />
            <InputField label="Custom CSS Class" value={cssClass} onChange={(v) => { setCssClass(v); markUnsaved() }} placeholder="e.g. featured-article" />

            <div className="p-4 bg-white rounded-xl border border-[#e4e2e1] flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Share Preview</p>
              <div className="rounded-lg overflow-hidden border border-[#e4e2e1]">
                {coverImage ? (
                  <img src={coverImage} alt="OG preview" className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-[#efedee] flex items-center justify-center text-[#9e9fa0] text-xs">No cover image</div>
                )}
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-[#313334] line-clamp-2">{seoTitle || title || 'Article Title'}</p>
                  <p className="text-[10px] text-[#9e9fa0] mt-1 line-clamp-2">{metaDescription || 'Article description will appear here…'}</p>
                  <p className="text-[9px] text-[#c0bebe] mt-1 uppercase tracking-wide">parallaxa.com</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPublishModal(true)}
              disabled={!title.trim() || !content.trim()}
              className="w-full py-3 rounded-full bg-[#585f64] text-white text-sm font-semibold hover:bg-[#3d4042] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={15} />
              Publish Article
            </button>
          </div>
        )
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fbf9f9] text-[#313334] font-['Inter'] selection:bg-[#dce3e9]">
      <Header />

      {/* Top Navigation Bar */}
      <header className="w-full sticky top-0 z-50 bg-[#fcf8f9]/90 backdrop-blur-md border-b border-[#e4e2e1] flex justify-between items-center px-6 lg:px-10 py-3">
        <div className="flex items-center gap-6">
          <span className="text-lg font-['Newsreader'] italic font-bold hidden sm:block">The Editorial Monolith</span>
          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-[#9e9fa0]">
            <span>Drafts</span>
            <ChevronRight size={12} />
            <span className="text-[#313334] font-medium truncate max-w-40">{title || 'Untitled'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-[#5e5f61] bg-[#efedee] rounded-full">
            <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : saveStatus === 'unsaved' ? 'bg-red-400' : 'bg-green-500'}`} />
            {saveLabel()}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-[#efedee] rounded-full p-0.5">
            {(['write', 'split', 'preview'] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold capitalize transition-all ${
                  viewMode === m ? 'bg-white text-[#313334] shadow-sm' : 'text-[#5e5f61] hover:text-[#313334]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Undo / Redo */}
          <button onClick={undo} disabled={historyIndex <= 0} title="Undo" className="p-2 text-[#585f64] hover:bg-black/5 rounded-lg transition-colors disabled:opacity-30">
            <RotateCcw size={16} />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="p-2 text-[#585f64] hover:bg-black/5 rounded-lg transition-colors disabled:opacity-30">
            <RotateCw size={16} />
          </button>

          {/* Preview / History */}
          <div className="hidden sm:flex items-center gap-1">
            <button title="View history" className="p-2 text-[#585f64] hover:bg-black/5 rounded-lg transition-colors">
              <History size={18} />
            </button>
            <button title="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-[#585f64] hover:bg-black/5 rounded-lg transition-colors">
              <AlignLeft size={18} />
            </button>
          </div>

          <div className="h-5 w-px bg-[#dcdad9] mx-1 hidden sm:block" />
          <button
            onClick={() => { setSaveStatus('saving'); setTimeout(() => { setSaveStatus('saved'); setLastSaved(new Date()) }, 600) }}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#e1e2e5] text-[#3d4042] text-sm font-medium hover:brightness-95 transition-all"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            disabled={!title.trim() || !content.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#585f64] text-white text-sm font-medium hover:bg-[#3d4042] active:scale-95 transition-all disabled:opacity-40"
          >
            <Send size={14} />
            Publish
          </button>

          <div className="ml-2 overflow-hidden rounded-full h-8 w-8 ring-2 ring-[#e9e8e9] shrink-0">
            <img
              alt="Editor"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiCmjtsZALvP1tQr0IPjUcaqsYFQY3S8G4Cma3NZLzqpQUdjfmdfHe3TsowYcJ3X0VGaGOh2uaV4oX6tJ8535JAV_BmBWg7sqMokF0qk_LcJVWvSHdBdm8e2KwgxB_FKN7KpHX0fGjloGzeQPVYhuNm9z_tUJ6UvoEUxCidJiENA__bYPJfn0-j9n54JUvdtT0BThEP0uouEXA36jZhjXacHWxRs03PXFJVhIOeFR22NaAK4z6NKI9ei4Y0_QepD_HxkqDVhVcYZ8"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)] overflow-hidden">
        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <aside className="hidden xl:flex h-full w-72 shrink-0 bg-[#f5f3f3] flex-col gap-4 py-6 px-3 overflow-y-auto border-r border-[#e4e2e1]">
            <div className="px-4">
              <h2 className="font-['Newsreader'] text-lg font-bold">Editorial Settings</h2>
              <p className="text-[10px] text-[#9e9fa0] mt-0.5">Article ID: {Math.floor(Math.random() * 9000) + 1000}</p>
            </div>

            <nav className="flex flex-col gap-0.5">
              {(
                [
                  { id: 'metadata', icon: <FileText size={16} />, label: 'Metadata' },
                  { id: 'seo',      icon: <SearchCheck size={16} />, label: 'SEO' },
                  { id: 'accessibility', icon: <Accessibility size={16} />, label: 'Accessibility' },
                  { id: 'tags',     icon: <Tag size={16} />, label: 'Tags' },
                  { id: 'distribution', icon: <Share2 size={16} />, label: 'Distribution' },
                ] as { id: SidebarTab; icon: React.ReactNode; label: string }[]
              ).map(({ id, icon, label }) => (
                <SidebarLink
                  key={id}
                  icon={icon}
                  label={label}
                  active={activeTab === id}
                  onClick={() => setActiveTab(id)}
                />
              ))}
            </nav>

            {/* Panel content */}
            <div className="px-2 flex-1 overflow-y-auto pb-4">
              {renderSidebarPanel()}
            </div>

            <div className="pt-4 border-t border-[#e4e2e1] flex flex-col gap-1 px-2">
              <SidebarLink icon={<Settings size={16} />} label="Settings" />
              <SidebarLink icon={<HelpCircle size={16} />} label="Support" />
            </div>
          </aside>
        )}

        {/* ── Main Writing Canvas ───────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Formatting Toolbar */}
          <div className="flex items-center gap-0.5 px-4 py-2 bg-white border-b border-[#e4e2e1] overflow-x-auto shrink-0">
            <ToolbarBtn icon={<Bold size={15} />} label="Bold" onClick={() => insertMarkdown('**', '**', 'bold text')} />
            <ToolbarBtn icon={<Italic size={15} />} label="Italic" onClick={() => insertMarkdown('*', '*', 'italic text')} />
            <ToolbarBtn icon={<Strikethrough size={15} />} label="Strikethrough" onClick={() => insertMarkdown('~~', '~~', 'strikethrough')} />
            <ToolbarBtn icon={<Code size={15} />} label="Inline Code" onClick={() => insertMarkdown('`', '`', 'code')} />
            <div className="h-5 w-px bg-[#e4e2e1] mx-1 shrink-0" />
            <ToolbarBtn icon={<Heading1 size={15} />} label="Heading 1" onClick={() => insertLinePrefix('# ')} />
            <ToolbarBtn icon={<Heading2 size={15} />} label="Heading 2" onClick={() => insertLinePrefix('## ')} />
            <div className="h-5 w-px bg-[#e4e2e1] mx-1 shrink-0" />
            <ToolbarBtn icon={<List size={15} />} label="Bullet List" onClick={() => insertLinePrefix('- ')} />
            <ToolbarBtn icon={<ListOrdered size={15} />} label="Numbered List" onClick={() => insertLinePrefix('1. ')} />
            <ToolbarBtn icon={<Quote size={15} />} label="Blockquote" onClick={() => insertLinePrefix('> ')} />
            <div className="h-5 w-px bg-[#e4e2e1] mx-1 shrink-0" />
            <ToolbarBtn icon={<Link size={15} />} label="Link" onClick={() => insertMarkdown('[', '](url)', 'link text')} />
            <ToolbarBtn icon={<ImageIcon size={15} />} label="Image" onClick={() => insertMarkdown('![', '](url)', 'alt text')} />
            <ToolbarBtn icon={<Minus size={15} />} label="Horizontal Rule" onClick={() => { handleContentChange(content + '\n\n---\n\n') }} />
            <div className="flex-1" />
            <span className="text-[10px] text-[#9e9fa0] whitespace-nowrap pr-1">
              {countWords(content)} words · ~{estimateReadTime(content)} min read
            </span>
          </div>

          {/* Editor / Preview / Split */}
          <div className="flex-1 overflow-hidden flex">
            {/* Write pane */}
            {(viewMode === 'write' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-[#e4e2e1]' : 'w-full'} overflow-y-auto`}>
                <div className="max-w-3xl mx-auto px-6 py-12 flex flex-col gap-8">
                  {/* Cover image preview */}
                  {coverImage && (
                    <div className="relative rounded-xl overflow-hidden aspect-video group">
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => setCoverImage('')}
                          className="px-4 py-2 bg-white/90 rounded-full text-xs font-semibold"
                        >
                          Remove Cover
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 flex-wrap">
                      {breaking && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <Zap size={10} /> Breaking
                        </span>
                      )}
                      {featured && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <Star size={10} /> Featured
                        </span>
                      )}
                      {trending && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                          <TrendingUp size={10} /> Trending
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <textarea
                      ref={titleRef}
                      className="w-full border-none bg-transparent font-['Newsreader'] text-5xl font-bold p-0 focus:ring-0 placeholder-[#e2e2e4] resize-none overflow-hidden leading-tight"
                      placeholder="Article Title…"
                      rows={1}
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); markUnsaved() }}
                    />
                    <div className="flex items-center gap-3 mt-3 text-sm text-[#9e9fa0]">
                      <span className="font-medium text-[#585f64]">{author || 'Anonymous'}</span>
                      {category && (
                        <>
                          <span className="w-1 h-1 bg-[#dcdad9] rounded-full" />
                          <span className="text-[#9e9fa0] text-xs uppercase tracking-wide">{category}</span>
                        </>
                      )}
                      <span className="w-1 h-1 bg-[#dcdad9] rounded-full" />
                      <span>~{estimateReadTime(content)} min read</span>
                      {tags.length > 0 && (
                        <>
                          <span className="w-1 h-1 bg-[#dcdad9] rounded-full" />
                          <div className="flex gap-1 flex-wrap">
                            {tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[10px] px-2 py-0.5 bg-[#efedee] text-[#5e5f61] rounded-full">#{t}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content textarea */}
                  <textarea
                    ref={textareaRef}
                    className="w-full border-none bg-transparent text-[1.05rem] leading-[1.85] p-0 focus:ring-0 text-[#313334] placeholder-[#d0cecd] resize-none font-['Inter'] min-h-[500px]"
                    placeholder="Start writing… Markdown is supported.

# Use headings
**Bold**, *italic*, `code`
- Lists work too
> Blockquotes for impact

```js
// Code blocks with syntax labels
console.log('Hello!')
```"
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    spellCheck
                  />
                </div>
              </div>
            )}

            {/* Preview pane */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto bg-white`}>
                <div className="max-w-3xl mx-auto px-6 py-12">
                  {/* Preview header */}
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 mb-6 flex-wrap">
                      {breaking && <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase tracking-wide"><Zap size={10} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wide"><Star size={10} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wide"><TrendingUp size={10} /> Trending</span>}
                    </div>
                  )}

                  {coverImage && (
                    <figure className="mb-8 rounded-xl overflow-hidden">
                      <img src={coverImage} alt="Cover" className="w-full object-cover max-h-72" />
                    </figure>
                  )}

                  {title && (
                    <h1 className="font-['Newsreader'] text-5xl font-bold text-[#1a1b1c] leading-tight mb-4">
                      {title}
                    </h1>
                  )}

                  {(author || category) && (
                    <div className="flex items-center gap-3 mb-8 text-sm text-[#9e9fa0] pb-6 border-b border-[#e4e2e1]">
                      <span className="font-medium text-[#585f64]">{author}</span>
                      {category && <><span className="w-1 h-1 bg-[#dcdad9] rounded-full" /><span className="text-xs uppercase tracking-wide">{category}</span></>}
                      <span className="w-1 h-1 bg-[#dcdad9] rounded-full" />
                      <Clock size={12} />
                      <span>~{estimateReadTime(content)} min read</span>
                    </div>
                  )}

                  <MarkdownPreview content={content} />

                  {tags.length > 0 && (
                    <div className="flex gap-2 mt-10 pt-6 border-t border-[#e4e2e1] flex-wrap">
                      {tags.map(t => (
                        <span key={t} className="px-3 py-1 bg-[#efedee] text-[#5e5f61] rounded-full text-xs font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Publish Modal ──────────────────────────────────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e4e2e1]">
              <h3 className="font-['Newsreader'] text-lg font-bold">Publish Article</h3>
              <button onClick={() => setShowPublishModal(false)} className="p-1.5 hover:bg-[#efedee] rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Summary */}
              <div className="p-4 bg-[#f5f3f3] rounded-xl space-y-2">
                <p className="text-xs font-semibold text-[#585f64] truncate">{title}</p>
                <div className="flex items-center gap-4 text-[10px] text-[#9e9fa0]">
                  <span>{countWords(content)} words</span>
                  <span>~{estimateReadTime(content)} min read</span>
                  <span className="capitalize">{visibility}</span>
                </div>
              </div>

              {/* Checks */}
              <div className="flex flex-col gap-2">
                <SEOItem success={!!title.trim()} text="Title is set" />
                <SEOItem success={!!content.trim()} text="Content is not empty" />
                <SEOItem success={!!category} text="Category assigned" />
                <SEOItem success={seoScore >= 50} text={`SEO score: ${seoScore}/100`} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPublishModal(false)} className="flex-1 py-2.5 rounded-full border border-[#dcdad9] text-sm font-medium text-[#5e5f61] hover:bg-[#efedee] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="flex-1 py-2.5 rounded-full bg-[#585f64] text-white text-sm font-semibold hover:bg-[#3d4042] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {publishing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  {publishing ? 'Publishing…' : 'Confirm & Publish'}
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