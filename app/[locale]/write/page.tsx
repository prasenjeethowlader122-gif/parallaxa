"use client";
import { slabo } from '@/lib/font'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import React, { useState, useRef, useCallback, useEffect, ComponentPropsWithoutRef } from 'react';
import CodeMirror from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorView } from '@codemirror/view'
// FIX: removed duplicate rehype-raw import conflict — combined properly below
import rehypeRaw from 'rehype-raw'
import {
  History, ChevronRight, SearchCheck, Accessibility, Tag, Share2, Settings,
  HelpCircle, Bold, Italic, Heading1, Heading2, Quote, Link, Image as ImageIcon,
  CheckCircle2, AlertCircle, Save, Send, X, Check, Copy, List, ListOrdered,
  Strikethrough, Code, Minus, RotateCcw, RotateCw, Clock, Star, Zap, TrendingUp,
  Hash, FileText, RefreshCw, PanelLeft, SlidersHorizontal,
} from 'lucide-react';
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import Markdown, { Components } from 'react-markdown'

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
      <code className="bg-[#efedee] text-[#585f64] px-1.5 py-0.5 rounded text-[0.82em] font-mono break-all">
        {children}
      </code>
    )
  }

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-[#dcdad9] bg-[#1e1e1e] text-gray-100 max-w-full">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#2a2a2a] border-b border-[#3a3a3a]">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest truncate mr-2">{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code.trim()); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors shrink-0"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 sm:px-4 py-3 text-xs sm:text-sm leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

const mdComponents: Components = {
  code: CodeBlock as Components['code'],
  h1: ({ children }) => <h1 className="font-['Newsreader'] text-2xl sm:text-3xl font-bold text-[#1a1b1c] mt-6 mb-3 leading-tight break-words">{children}</h1>,
  h2: ({ children }) => <h2 className="font-['Newsreader'] text-xl sm:text-2xl font-semibold text-[#1a1b1c] mt-5 mb-2 leading-snug break-words">{children}</h2>,
  h3: ({ children }) => <h3 className="font-['Newsreader'] text-lg sm:text-xl font-semibold text-[#313334] mt-4 mb-1 break-words">{children}</h3>,
  p: ({ children }) => <p className="text-[#313334] text-base sm:text-[1.05rem] leading-[1.8] my-2 break-words">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 sm:pl-6 my-3 flex flex-col gap-1.5 text-base sm:text-[1.05rem] text-[#313334]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 sm:pl-6 my-3 flex flex-col gap-1.5 text-base sm:text-[1.05rem] text-[#313334]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed break-words">{children}</li>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-[#585f64] pl-4 sm:pl-5 my-4 text-[#5e5f61] italic text-base sm:text-lg font-['Newsreader']">{children}</blockquote>,
  table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-[#e4e2e1] max-w-full"><table className="min-w-full text-xs sm:text-sm">{children}</table></div>,
  thead: ({ children }) => <thead className="bg-[#f5f3f3] text-[#585f64]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[#efedee]">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 sm:px-4 py-2.5 text-[#313334] break-words">{children}</td>,
  hr: () => <hr className="my-6 border-[#e4e2e1]" />,
  strong: ({ children }) => <strong className="font-bold text-[#1a1b1c]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#5e5f61]">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#585f64] underline underline-offset-2 hover:text-[#313334] transition-colors break-all">
      {children}
    </a>
  ),
}

// FIX: rehypePlugins combined into single array — previously [rehypeRaw] was overwritten by [rehypeKatex]
function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return <div className="text-[#c0bebe] font-['Newsreader'] italic text-lg sm:text-xl text-center py-16">Nothing to preview yet…</div>
  }
  return (
    <div className="min-w-0 overflow-hidden w-full">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={mdComponents}
      >
        {content}
      </Markdown>
    </div>
  )
}

const ToolbarBtn = ({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) => (
  <button title={label} onClick={onClick}
    className={`p-1.5 sm:p-2 rounded-lg transition-all shrink-0 ${active ? 'bg-[#585f64] text-white' : 'text-[#585f64] hover:bg-black/5 hover:text-[#313334]'}`}>
    {icon}
  </button>
)

const SidebarLink = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-sm w-full text-left ${active ? 'bg-white text-[#585f64] font-semibold shadow-sm' : 'text-[#5e5f65] hover:bg-black/5'}`}>
    <span className="shrink-0">{icon}</span>
    <span className="truncate">{label}</span>
  </button>
)

const SEOItem = ({ success, text }: { success: boolean; text: string }) => (
  <div className="flex items-start gap-2.5">
    {success
      ? <CheckCircle2 size={14} className="text-green-600 mt-0.5 shrink-0" fill="currentColor" />
      : <AlertCircle size={14} className="text-[#9f403d] mt-0.5 shrink-0" fill="currentColor" />
    }
    <span className="text-xs text-[#313334] leading-snug break-words min-w-0">{text}</span>
  </div>
)

const InputField = ({ label, value, onChange, placeholder, multiline, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; hint?: string
}) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">{label}</label>
    {multiline
      ? <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full min-w-0 text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 resize-none focus:ring-1 focus:ring-[#585f64] outline-none placeholder-[#c0bebe]" />
      : <input type="text" value={value} onChange={(e) => { onChange(e.target.value); e.target.focus() }} placeholder={placeholder}
          className="w-full min-w-0 text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none placeholder-[#c0bebe]" />
    }
    {hint && <p className="text-[10px] text-[#9e9fa0] break-words">{hint}</p>}
  </div>
)

const Toggle = ({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) => (
  <div className="flex items-start justify-between gap-3 min-w-0">
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-[#313334]">{label}</p>
      {description && <p className="text-[10px] text-[#9e9fa0] mt-0.5 break-words">{description}</p>}
    </div>
    <button onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-9 h-5 rounded-2xl transition-colors duration-200 ${checked ? 'bg-[#585f64]' : 'bg-[#dcdad9]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-2xl bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  </div>
)

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200))
}

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

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) { setAuthor(session.user.name ?? '') }
  }, [session?.user])

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
        const response = await fetch(`/api/articles/${id}`);
        if (response.ok) {
          const data = await response.json();
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
        console.error("Failed to fetch article:", error);
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
    if (textareaRef.current && viewMode === 'write') {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 400)}px`
    }
  }, [content, viewMode])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileDrawerOpen(false) }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const markdownTheme = EditorView.theme({
    '&': { fontSize: '1.05rem', fontFamily: 'var(--font-slabo), serif', background: 'transparent !important', color: '#313334' },
    '.cm-content': { padding: '0', caretColor: '#585f64' },
    '.cm-line': { padding: '0', lineHeight: '1.8' },
    '.cm-focused': { outline: 'none !important' },
    '.cm-editor': { background: 'transparent !important' },
    '.cm-scroller': { overflow: 'visible' },
    '.cm-header-1': { fontSize: '1.6em', fontWeight: 'bold', color: '#1a1b1c' },
    '.cm-header-2': { fontSize: '1.3em', fontWeight: 'bold', color: '#1a1b1c' },
    '.cm-header-3': { fontSize: '1.1em', fontWeight: '600', color: '#313334' },
    '.cm-strong': { fontWeight: 'bold', color: '#1a1b1c' },
    '.cm-em': { fontStyle: 'italic', color: '#5e5f61' },
    '.cm-strikethrough': { textDecoration: 'line-through', color: '#9e9fa0' },
    '.cm-monospace': { fontFamily: 'monospace', background: '#efedee', color: '#585f64', borderRadius: '4px', padding: '0 4px' },
    '.cm-link': { color: '#585f64', textDecoration: 'underline' },
    '.cm-url': { color: '#9e9fa0' },
    '.cm-quote': { color: '#5e5f61', borderLeft: '3px solid #585f64', paddingLeft: '8px' },
    '.cm-list': { color: '#585f64' },
    '.cm-gutters': { display: 'none' },
    '.cm-activeLineGutter': { display: 'none' },
    '.cm-activeLine': { background: 'transparent' },
  })

  const pushHistory = useCallback((val: string) => {
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), val].slice(-100))
    setHistoryIndex((i) => Math.min(i + 1, 99))
  }, [historyIndex])

  const undo = () => { if (historyIndex > 0) { const i = historyIndex - 1; setContent(history[i]); setHistoryIndex(i) } }
  const redo = () => { if (historyIndex < history.length - 1) { const i = historyIndex + 1; setContent(history[i]); setHistoryIndex(i) } }

  const handleContentChange = (val: string) => { setContent(val); markUnsaved(); pushHistory(val) }

  const insertMarkdown = useCallback((before: string, after = '', placeholder = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end) || placeholder
    handleContentChange(content.slice(0, start) + before + selected + after + content.slice(end))
    setTimeout(() => { ta.focus(); const c = start + before.length + selected.length; ta.setSelectionRange(c, c) }, 0)
  }, [content])

  const insertLinePrefix = useCallback((prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    handleContentChange(content.slice(0, lineStart) + prefix + content.slice(lineStart))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, start + prefix.length) }, 0)
  }, [content])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !tags.includes(t)) { setTags([...tags, t]); markUnsaved() }
    setTagInput('')
  }
  const removeTag = (t: string) => { setTags(tags.filter((x) => x !== t)); markUnsaved() }

  const seoChecks = [
    { success: title.length >= 10 && title.length <= 70, text: `Title length (${title.length}/70 chars)` },
    { success: !!focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase()), text: 'Focus keyword in title' },
    { success: metaDescription.length >= 120 && metaDescription.length <= 160, text: `Meta desc (${metaDescription.length}/160)` },
    { success: countWords(content) >= 300, text: `Word count ≥ 300 (${countWords(content)})` },
    { success: !!coverImage, text: 'Cover image set' },
    { success: !noIndex, text: 'Page is indexable' },
  ]
  const seoScore = Math.round((seoChecks.filter((c) => c.success).length / seoChecks.length) * 100)

  const a11yChecks = [
    { success: title.trim().length > 0, text: 'Article has a title' },
    { success: content.length > 0, text: 'Article has content' },
    { success: !!coverImage, text: 'Cover image provided' },
    { success: allowComments, text: 'Comments enabled' },
    { success: true, text: 'AMP compatibility configured' },
  ]

  // FIX: response.json() একবারই call করা হচ্ছে — আগে ok check, তারপর json parse
  const handlePublish = async () => {
    setPublishing(true);
    try {
      const payload = {
        title, description: metaDescription || '', content, category,
        image: coverImage, readTime: estimateReadTime(content),
        featured, breaking, trending, tags,
        seoTitle, metaDescription, focusKeyword, canonicalUrl, ogImage,
        twitterCard, noIndex, allowComments, showInRss, ampEnabled,
        redirectUrl, cssClass, visibility,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: 'published',
      };

      const response = await fetch(id ? `/api/articles/${id}` : '/api/articles', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // FIX: json() একবার পড়া হচ্ছে, তারপর ok check
      const j = await response.json();
      if (!response.ok) {
        throw new Error(j.error || 'Publish failed');
      }

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

  const renderSidebarPanel = () => {
    switch (activeTab) {
      case 'metadata':
        return (
          <div className="flex flex-col gap-4 min-w-0">
            <InputField label="Category" value={category} onChange={(v) => { setCategory(v); markUnsaved() }} placeholder="e.g. Technology" />
            <InputField label="Author" value={author} onChange={(v) => { setAuthor(v); markUnsaved() }} />
            <InputField label="Cover Image URL" value={coverImage} onChange={(v) => { setCoverImage(v); markUnsaved() }} placeholder="https://…" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Visibility</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['public', 'private', 'unlisted'] as Visibility[]).map((v) => (
                  <button key={v} onClick={() => { setVisibility(v); markUnsaved() }}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-medium capitalize transition-all truncate ${visibility === v ? 'bg-[#585f64] text-white' : 'bg-[#efedee] text-[#5e5f61] hover:bg-[#e4e2e1]'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Article Badges</p>
              <Toggle label="Featured" description="Shown in featured sections" checked={featured} onChange={(v) => { setFeatured(v); markUnsaved() }} />
              <Toggle label="Breaking News" description="Urgent banner treatment" checked={breaking} onChange={(v) => { setBreaking(v); markUnsaved() }} />
              <Toggle label="Trending" description="Highlight as trending" checked={trending} onChange={(v) => { setTrending(v); markUnsaved() }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Schedule Publish</label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); markUnsaved() }}
                className="w-full text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none" />
              <p className="text-[10px] text-[#9e9fa0]">Leave blank to publish immediately</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Words', value: countWords(content).toLocaleString() },
                { label: 'Read Time', value: `~${estimateReadTime(content)} min` },
                { label: 'Characters', value: content.length.toLocaleString() },
                { label: 'Paragraphs', value: String(content.split(/\n\n+/).filter(Boolean).length) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl p-3 border border-[#e4e2e1] min-w-0 overflow-hidden">
                  <p className="text-[9px] uppercase tracking-widest text-[#9e9fa0]">{label}</p>
                  <p className="text-base font-bold text-[#313334] mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      case 'seo':
        return (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <div className="relative w-12 h-12 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#efedee" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={seoScore >= 70 ? '#22c55e' : seoScore >= 40 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${seoScore} 100`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#313334]">{seoScore}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#313334]">SEO Score</p>
                <p className="text-xs text-[#5e5f61] break-words">{seoScore >= 70 ? 'Good — keep going!' : seoScore >= 40 ? 'Needs improvement' : 'Poor — fix issues below'}</p>
              </div>
            </div>
            <InputField label="SEO Title" value={seoTitle} onChange={(v) => { setSeoTitle(v); markUnsaved() }} placeholder={title || 'Title for search engines'} hint={`${seoTitle.length}/70 chars`} />
            <InputField label="Focus Keyword" value={focusKeyword} onChange={(v) => { setFocusKeyword(v); markUnsaved() }} placeholder="e.g. narrative architecture" />
            <InputField label="Meta Description" value={metaDescription} onChange={(v) => { setMetaDescription(v); markUnsaved() }} placeholder="Brief summary…" multiline hint={`${metaDescription.length}/160 chars`} />
            <InputField label="Canonical URL" value={canonicalUrl} onChange={(v) => { setCanonicalUrl(v); markUnsaved() }} placeholder="https://…" />
            <InputField label="OG Image URL" value={ogImage} onChange={(v) => { setOgImage(v); markUnsaved() }} placeholder="https://…" />
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Twitter Card</label>
              <select value={twitterCard} onChange={(e) => { setTwitterCard(e.target.value); markUnsaved() }}
                className="w-full text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none">
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
          <div className="flex flex-col gap-4 min-w-0">
            <div className="p-4 bg-white rounded-xl border border-[#e4e2e1]">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61] mb-3">A11y Checklist</p>
              <div className="flex flex-col gap-2.5">{a11yChecks.map((c, i) => <SEOItem key={i} success={c.success} text={c.text} />)}</div>
            </div>
            <Toggle label="Allow Comments" description="Let readers engage below" checked={allowComments} onChange={(v) => { setAllowComments(v); markUnsaved() }} />
            <Toggle label="AMP Enabled" description="Faster mobile loads" checked={ampEnabled} onChange={(v) => { setAmpEnabled(v); markUnsaved() }} />
            <div className="p-4 bg-[#fef9c3] rounded-xl border border-[#fde68a]">
              <p className="text-xs text-[#92400e] font-medium">Accessibility tip</p>
              <p className="text-[11px] text-[#78350f] mt-1 leading-relaxed break-words">Add alt text to images: <code className="bg-[#fde68a]/50 px-1 rounded text-[10px] break-all">![alt text](url)</code></p>
            </div>
          </div>
        )
      case 'tags':
        return (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a tag…"
                className="flex-1 min-w-0 text-xs text-[#313334] bg-white border border-[#dcdad9] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#585f64] outline-none" />
              <button onClick={addTag} className="shrink-0 px-3 py-2 bg-[#585f64] text-white rounded-lg text-xs font-medium hover:bg-[#3d4042] transition-colors">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#dcdad9] rounded-2xl text-xs text-[#313334] font-medium max-w-full">
                  <Hash size={10} className="text-[#9e9fa0] shrink-0" />
                  <span className="truncate max-w-[100px]">{tag}</span>
                  <button onClick={() => removeTag(tag)} className="text-[#9e9fa0] hover:text-[#9f403d] transition-colors shrink-0"><X size={10} /></button>
                </span>
              ))}
              {tags.length === 0 && <p className="text-xs text-[#9e9fa0] italic">No tags yet.</p>}
            </div>
            <div className="p-3 bg-white rounded-xl border border-[#e4e2e1]">
              <p className="text-[9px] uppercase tracking-widest text-[#9e9fa0] mb-2">Suggested</p>
              <div className="flex flex-wrap gap-1.5">
                {['journalism', 'editorial', 'media', 'writing', 'content', 'typography', 'ui-design', 'publishing']
                  .filter(t => !tags.includes(t)).map(t => (
                    <button key={t} onClick={() => { setTags(prev => [...prev, t]); markUnsaved() }}
                      className="px-2.5 py-1 bg-[#efedee] rounded-2xl text-[10px] text-[#5e5f61] hover:bg-[#585f64] hover:text-white transition-colors">
                      + {t}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )
      case 'distribution':
        return (
          <div className="flex flex-col gap-4 min-w-0">
            <div className="p-4 bg-white rounded-xl border border-[#e4e2e1] flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Publish Settings</p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Status</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['draft', 'published', 'scheduled'] as ArticleStatus[]).map((s) => (
                    <button key={s} onClick={() => { setStatus(s); markUnsaved() }}
                      className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold capitalize transition-all truncate ${status === s ? 'bg-[#585f64] text-white' : 'bg-[#efedee] text-[#5e5f61] hover:bg-[#e4e2e1]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle label="Show in RSS Feed" checked={showInRss} onChange={(v) => { setShowInRss(v); markUnsaved() }} description="Include in RSS syndication" />
            </div>
            <InputField label="Redirect URL" value={redirectUrl} onChange={(v) => { setRedirectUrl(v); markUnsaved() }} placeholder="Redirect URL…" hint="Leave blank for default slug" />
            <InputField label="Custom CSS Class" value={cssClass} onChange={(v) => { setCssClass(v); markUnsaved() }} placeholder="e.g. featured-article" />
            <div className="p-4 bg-white rounded-xl border border-[#e4e2e1] flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#5e5f61]">Share Preview</p>
              <div className="rounded-lg overflow-hidden border border-[#e4e2e1]">
                {coverImage
                  ? <img src={coverImage} alt="OG preview" className="w-full h-24 object-cover" />
                  : <div className="w-full h-24 bg-[#efedee] flex items-center justify-center text-[#9e9fa0] text-xs">No cover image</div>
                }
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-[#313334] line-clamp-2 break-words">{seoTitle || title || 'Article Title'}</p>
                  <p className="text-[10px] text-[#9e9fa0] mt-1 line-clamp-2 break-words">{metaDescription || 'Description…'}</p>
                  <p className="text-[9px] text-[#c0bebe] mt-1 uppercase tracking-wide">exposer.com</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowPublishModal(true)} disabled={!title.trim() || !content.trim()}
              className="w-full py-3 rounded-2xl bg-[#585f64] text-white text-sm font-semibold hover:bg-[#3d4042] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <Send size={14} /> Publish Article
            </button>
          </div>
        )
    }
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      <div className="px-4 pb-3 shrink-0">
        <h2 className="font-['Newsreader'] text-lg font-bold">Editorial Settings</h2>
        <p className="text-[10px] text-[#9e9fa0] mt-0.5">Article ID: {id ?? 'new'}</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-1 shrink-0">
        {([
          { id: 'metadata', icon: <FileText size={15} />, label: 'Metadata' },
          { id: 'seo', icon: <SearchCheck size={15} />, label: 'SEO' },
          { id: 'accessibility', icon: <Accessibility size={15} />, label: 'Accessibility' },
          { id: 'tags', icon: <Tag size={15} />, label: 'Tags' },
          { id: 'distribution', icon: <Share2 size={15} />, label: 'Distribution' },
        ] as { id: SidebarTab; icon: React.ReactNode; label: string }[]).map(({ id: tabId, icon, label }) => (
          <SidebarLink key={tabId} icon={icon} label={label} active={activeTab === tabId}
            onClick={() => { setActiveTab(tabId); setMobileDrawerOpen(false) }} />
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-3 min-w-0 bg-white">
        {renderSidebarPanel()}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      <header className="w-full sticky top-0 z-50 bg-[#fcf8f9]/95 backdrop-blur-md border-b border-[#e4e2e1]">
        <div className="flex items-center justify-between px-3 sm:px-5 lg:px-8 py-2.5 gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1 text-xs text-[#9e9fa0] min-w-0">
              <span className="hidden sm:inline shrink-0 text-[#9e9fa0]">Drafts</span>
              <ChevronRight size={11} className="hidden sm:inline shrink-0" />
              <span className="text-[#313334] font-medium truncate">{title || 'Untitled'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium text-[#5e5f61] bg-[#efedee] rounded-2xl">
              <span className={`w-1.5 h-1.5 rounded-2xl shrink-0 ${saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : saveStatus === 'unsaved' ? 'bg-red-400' : 'bg-green-500'}`} />
              <span className="whitespace-nowrap">{saveLabel()}</span>
            </div>
            <div className="flex items-center bg-[#efedee] rounded-2xl p-0.5 shrink-0 ml-1">
              {(['write', 'split', 'preview'] as ViewMode[]).map((m) => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-2 sm:px-3 py-1.5 rounded-2xl text-[10px] font-semibold transition-all ${viewMode === m ? 'bg-white text-[#313334] shadow-sm' : 'text-[#5e5f61]'}`}>
                  <span className="hidden sm:inline capitalize">{m}</span>
                  <span className="sm:hidden" aria-label={m}>{m === 'write' ? '✏️' : m === 'preview' ? '👁' : '⧉'}</span>
                </button>
              ))}
            </div>
            <button onClick={undo} disabled={historyIndex <= 0} title="Undo" className="hidden sm:block p-1.5 text-[#585f64] hover:bg-black/5 rounded-lg disabled:opacity-30 shrink-0"><RotateCcw size={15} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="hidden sm:block p-1.5 text-[#585f64] hover:bg-black/5 rounded-lg disabled:opacity-30 shrink-0"><RotateCw size={15} /></button>
            <button title="View history" className="hidden lg:block p-1.5 text-[#585f64] hover:bg-black/5 rounded-lg shrink-0"><History size={15} /></button>
            <button title="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden xl:block p-1.5 text-[#585f64] hover:bg-black/5 rounded-lg shrink-0"><PanelLeft size={15} /></button>
            <button title="Article settings" onClick={() => setMobileDrawerOpen(true)} className="xl:hidden p-1.5 text-[#585f64] hover:bg-black/5 rounded-lg shrink-0"><SlidersHorizontal size={15} /></button>
            <div className="h-4 w-px bg-[#dcdad9] hidden sm:block mx-0.5 shrink-0" />
            <button onClick={() => { setSaveStatus('saving'); setTimeout(() => { setSaveStatus('saved'); setLastSaved(new Date()) }, 600) }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-[#e1e2e5] text-[#3d4042] text-xs font-medium hover:brightness-95 transition-all shrink-0">
              <Save size={12} /><span>Save</span>
            </button>
            <button onClick={() => setShowPublishModal(true)} disabled={!title.trim() || !content.trim()}
              className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-2xl bg-[#585f64] text-white text-xs font-medium hover:bg-[#3d4042] active:scale-95 transition-all disabled:opacity-40 shrink-0">
              <Send size={12} /><span>Publish</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex overflow-hidden" style={{ height: 'calc(100dvh - 113px)' }}>
        {sidebarOpen && (
          <aside className="hidden xl:flex h-full w-72 shrink-0 bg-[#f5f3f3] flex-col py-4 overflow-hidden border-r border-[#e4e2e1]">
            <SidebarInner />
          </aside>
        )}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex items-center px-2 sm:px-3 py-1.5 bg-white overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
            <ToolbarBtn icon={<Bold size={14} />} label="Bold" onClick={() => insertMarkdown('**', '**', 'bold text')} />
            <ToolbarBtn icon={<Italic size={14} />} label="Italic" onClick={() => insertMarkdown('*', '*', 'italic text')} />
            <ToolbarBtn icon={<Strikethrough size={14} />} label="Strikethrough" onClick={() => insertMarkdown('~~', '~~', 'strikethrough')} />
            <ToolbarBtn icon={<Code size={14} />} label="Inline Code" onClick={() => insertMarkdown('`', '`', 'code')} />
            <div className="h-4 w-px bg-[#e4e2e1] mx-1 shrink-0" />
            <ToolbarBtn icon={<Heading1 size={14} />} label="Heading 1" onClick={() => insertLinePrefix('# ')} />
            <ToolbarBtn icon={<Heading2 size={14} />} label="Heading 2" onClick={() => insertLinePrefix('## ')} />
            <div className="h-4 w-px bg-[#e4e2e1] mx-1 shrink-0" />
            <ToolbarBtn icon={<List size={14} />} label="Bullet List" onClick={() => insertLinePrefix('- ')} />
            <ToolbarBtn icon={<ListOrdered size={14} />} label="Numbered List" onClick={() => insertLinePrefix('1. ')} />
            <ToolbarBtn icon={<Quote size={14} />} label="Blockquote" onClick={() => insertLinePrefix('> ')} />
            <div className="h-4 w-px bg-[#e4e2e1] mx-1 shrink-0" />
            <ToolbarBtn icon={<Link size={14} />} label="Link" onClick={() => insertMarkdown('[', '](url)', 'link text')} />
            <ToolbarBtn icon={<ImageIcon size={14} />} label="Image" onClick={() => insertMarkdown('![', '](url)', 'alt text')} />
            <ToolbarBtn icon={<Minus size={14} />} label="Divider" onClick={() => handleContentChange(content + '\n\n---\n\n')} />
            <div className="h-4 w-px bg-[#e4e2e1] mx-1 sm:hidden shrink-0" />
            <button onClick={undo} disabled={historyIndex <= 0} title="Undo" className="sm:hidden p-1.5 text-[#585f64] rounded-lg disabled:opacity-30 shrink-0"><RotateCcw size={14} /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo" className="sm:hidden p-1.5 text-[#585f64] rounded-lg disabled:opacity-30 shrink-0"><RotateCw size={14} /></button>
            <div className="flex-1 min-w-[8px]" />
            <span className="hidden sm:block text-[10px] text-[#9e9fa0] whitespace-nowrap pr-1 shrink-0">{countWords(content)}w · ~{estimateReadTime(content)}min</span>
          </div>

          <div className="flex-1 overflow-hidden flex min-w-0">
            {(viewMode === 'write' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-[#e4e2e1]' : 'w-full'} overflow-y-auto min-w-0`}>
                <div className="mx-auto px-4 sm:px-8 py-8 sm:py-12 flex flex-col gap-5 w-full max-w-3xl">
                  {coverImage && (
                    <div className="relative rounded-xl overflow-hidden aspect-video group">
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => setCoverImage('')} className="px-4 py-2 bg-white/90 rounded-2xl text-xs font-semibold">Remove Cover</button>
                      </div>
                    </div>
                  )}
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 flex-wrap">
                      {breaking && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-2xl text-[10px] font-bold uppercase"><Zap size={9} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-2xl text-[10px] font-bold uppercase"><Star size={9} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-2xl text-[10px] font-bold uppercase"><TrendingUp size={9} /> Trending</span>}
                    </div>
                  )}
                  <div className="min-w-0">
                    <textarea ref={titleRef}
                      className="w-full border-none bg-transparent font-['Newsreader'] text-3xl sm:text-4xl lg:text-5xl font-bold p-0 focus:ring-0 placeholder-[#e2e2e4] resize-none overflow-hidden leading-tight outline-none"
                      placeholder="Article Title…" rows={1} value={title}
                      onChange={(e) => { setTitle(e.target.value); markUnsaved() }} />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-[#9e9fa0]">
                      <span className="font-medium text-[#585f64] shrink-0">{author || 'Anonymous'}</span>
                      {category && <span className="uppercase tracking-wide shrink-0">{category}</span>}
                      <span className="shrink-0">~{estimateReadTime(content)} min read</span>
                      {tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 bg-[#efedee] text-[#5e5f61] rounded-2xl shrink-0">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <CodeMirror
                    value={content}
                    onChange={(val) => handleContentChange(val)}
                    extensions={[markdown({ base: markdownLanguage, codeLanguages: languages }), EditorView.lineWrapping, markdownTheme]}
                    basicSetup={{ lineNumbers: false, foldGutter: false, dropCursor: false, allowMultipleSelections: false, indentOnInput: false, highlightActiveLine: false, highlightSelectionMatches: false }}
                    className={slabo.className + " w-full min-h-[400px] outline-none"}
                    placeholder={`Start writing… Markdown is supported.\n\n# Use headings\n**Bold**, *italic*, \`code\`\n- Lists work too\n> Blockquotes for impact`}
                  />
                </div>
              </div>
            )}

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto bg-white min-w-0`}>
                <div className="mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full max-w-3xl min-w-0 overflow-hidden">
                  {(breaking || featured || trending) && (
                    <div className="flex gap-2 mb-5 flex-wrap">
                      {breaking && <span className="flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-2xl text-[10px] font-bold uppercase"><Zap size={9} /> Breaking</span>}
                      {featured && <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-2xl text-[10px] font-bold uppercase"><Star size={9} /> Featured</span>}
                      {trending && <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-2xl text-[10px] font-bold uppercase"><TrendingUp size={9} /> Trending</span>}
                    </div>
                  )}
                  {coverImage && <figure className="mb-6 rounded-xl overflow-hidden"><img src={coverImage} alt="Cover" className="w-full object-cover max-h-48 sm:max-h-72" /></figure>}
                  {title && <h1 className="font-['Newsreader'] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a1b1c] leading-tight mb-4 break-words">{title}</h1>}
                  {(author || category) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6 text-xs text-[#9e9fa0] pb-5 border-b border-[#e4e2e1]">
                      <span className="font-medium text-[#585f64]">{author}</span>
                      {category && <span className="uppercase tracking-wide">{category}</span>}
                      <span className="flex items-center gap-1"><Clock size={11} />~{estimateReadTime(content)} min</span>
                    </div>
                  )}
                  <MarkdownPreview content={content} />
                  {tags.length > 0 && (
                    <div className="flex gap-2 mt-8 pt-5 border-t border-[#e4e2e1] flex-wrap">
                      {tags.map(t => <span key={t} className="px-3 py-1 bg-[#efedee] text-[#5e5f61] rounded-2xl text-xs font-medium">#{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {mobileDrawerOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm xl:hidden" onClick={() => setMobileDrawerOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 z-[70] bg-[#f5f3f3] flex flex-col shadow-2xl xl:hidden overflow-hidden" style={{ width: 'min(320px, 92vw)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e2e1] bg-white shrink-0">
              <h2 className="font-['Newsreader'] text-base font-bold">Article Settings</h2>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1.5 hover:bg-[#efedee] rounded-lg transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-hidden"><SidebarInner /></div>
          </div>
        </>
      )}

      {showPublishModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-2xl bg-[#dcdad9]" /></div>
            <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-[#e4e2e1]">
              <h3 className="font-['Newsreader'] text-lg font-bold">Publish Article</h3>
              <button onClick={() => setShowPublishModal(false)} className="p-1.5 hover:bg-[#efedee] rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-5 sm:p-6 flex flex-col gap-4">
              <div className="p-4 bg-[#f5f3f3] rounded-xl space-y-2">
                <p className="text-xs font-semibold text-[#585f64] break-words line-clamp-2">{title || 'Untitled'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#9e9fa0]">
                  <span>{countWords(content)} words</span>
                  <span>~{estimateReadTime(content)} min read</span>
                  <span className="capitalize">{visibility}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-sm">
                <SEOItem success={!!title.trim()} text="Title is set" />
                <SEOItem success={!!content.trim()} text="Content is not empty" />
                <SEOItem success={!!category} text="Category assigned" />
                <SEOItem success={seoScore >= 50} text={`SEO score: ${seoScore}/100`} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-[#dcdad9] text-sm font-medium text-[#5e5f61] hover:bg-[#efedee] transition-colors">
                  Cancel
                </button>
                <button onClick={handlePublish} disabled={publishing}
                  className="flex-1 py-2.5 rounded-2xl bg-[#585f64] text-white text-sm font-semibold hover:bg-[#3d4042] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {publishing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
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