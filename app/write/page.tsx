'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Bold, Italic, Underline, Strikethrough, Link2, List, ListOrdered,
  Quote, Heading2, Heading3, Image as ImageIcon, AlignLeft, AlignCenter,
  AlignRight, Undo, Redo, Eye, EyeOff, Save, Send, ChevronDown,
  Check, Clock, Star, Zap, TrendingUp, Globe, Lock, Calendar,
  Tag, BarChart2, Rss, ExternalLink, Code, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'write' | 'seo' | 'advanced'
type Status = 'draft' | 'published' | 'scheduled'
type Visibility = 'public' | 'private'

interface ArticleForm {
  title: string
  description: string
  content: string
  category: string
  image: string
  readTime: number
  featured: boolean
  breaking: boolean
  trending: boolean
  status: Status
  visibility: Visibility
  seoTitle: string
  metaDescription: string
  focusKeyword: string
  canonicalUrl: string
  ogImage: string
  twitterCard: 'summary' | 'summary_large_image'
  noIndex: boolean
  allowComments: boolean
  showInRss: boolean
  ampEnabled: boolean
  redirectUrl: string
  cssClass: string
  scheduledAt: string
}

const CATEGORIES = [
  'Politics', 'Business', 'Technology', 'Science', 'Health',
  'Sports', 'Entertainment', 'World', 'Opinion', 'Culture',
]

const DEFAULT_FORM: ArticleForm = {
  title: '', description: '', content: '', category: 'World',
  image: '', readTime: 3, featured: false, breaking: false, trending: false,
  status: 'draft', visibility: 'public',
  seoTitle: '', metaDescription: '', focusKeyword: '', canonicalUrl: '',
  ogImage: '', twitterCard: 'summary_large_image',
  noIndex: false, allowComments: true, showInRss: true, ampEnabled: false,
  redirectUrl: '', cssClass: '', scheduledAt: '',
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolBtn({
  onClick, title, active, children
}: {
  onClick: () => void; title: string; active?: boolean; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`
        w-8 h-8 flex items-center justify-center rounded transition-all duration-100 flex-shrink-0
        ${active
          ? 'bg-red-600 text-white shadow-sm'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }
      `}
    >
      {children}
    </button>
  )
}

// ─── Rich Text Toolbar ────────────────────────────────────────────────────────

function RichToolbar({ editorRef }: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const insertBlock = (tag: string) => {
    editorRef.current?.focus()
    document.execCommand('formatBlock', false, tag)
  }

  const insertLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) exec('createLink', url)
  }

  const insertImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url) exec('insertImage', url)
  }

  const sep = <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-gray-50/80">
      <ToolBtn onClick={() => exec('undo')} title="Undo"><Undo className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('redo')} title="Redo"><Redo className="w-3.5 h-3.5" /></ToolBtn>
      {sep}
      <ToolBtn onClick={() => insertBlock('h2')} title="Heading 2"><Heading2 className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => insertBlock('h3')} title="Heading 3"><Heading3 className="w-3.5 h-3.5" /></ToolBtn>
      {sep}
      <ToolBtn onClick={() => exec('bold')} title="Bold"><Bold className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('italic')} title="Italic"><Italic className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('underline')} title="Underline"><Underline className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('strikeThrough')} title="Strikethrough"><Strikethrough className="w-3.5 h-3.5" /></ToolBtn>
      {sep}
      <ToolBtn onClick={() => exec('insertUnorderedList')} title="Bullet list"><List className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('insertOrderedList')} title="Numbered list"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => insertBlock('blockquote')} title="Blockquote"><Quote className="w-3.5 h-3.5" /></ToolBtn>
      {sep}
      <ToolBtn onClick={() => exec('justifyLeft')} title="Align left"><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('justifyCenter')} title="Align center"><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => exec('justifyRight')} title="Align right"><AlignRight className="w-3.5 h-3.5" /></ToolBtn>
      {sep}
      <ToolBtn onClick={insertLink} title="Insert link"><Link2 className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={insertImage} title="Insert image"><ImageIcon className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn onClick={() => insertBlock('pre')} title="Code block"><Code className="w-3.5 h-3.5" /></ToolBtn>
    </div>
  )
}

// ─── Toggle Badge ─────────────────────────────────────────────────────────────

function ToggleBadge({ label, active, onChange, icon }: {
  label: string; active: boolean; onChange: () => void; icon?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
        border transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-red-50 border-red-300 text-red-700'
          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
        }
      `}
    >
      {icon && <span className={active ? 'text-red-500' : 'text-gray-400'}>{icon}</span>}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-red-500' : 'bg-gray-300'}`} />
      {label}
    </button>
  )
}

// ─── Field Wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold tracking-[0.1em] text-gray-400 uppercase">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 leading-snug">{hint}</p>}
    </div>
  )
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-2">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-[10px] font-bold tracking-[0.14em] text-gray-400 uppercase whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

// ─── Word count helper ────────────────────────────────────────────────────────

function wordCount(html: string) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').length : 0
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WritePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [form, setForm] = useState<ArticleForm>(DEFAULT_FORM)
  const [activeTab, setActiveTab] = useState<Tab>('write')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [charCount, setCharCount] = useState(0)
  const [wc, setWc] = useState(0)
  const [catOpen, setCatOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const catRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef<HTMLDivElement>(null)

  const setField = useCallback(<K extends keyof ArticleForm>(key: K, val: ArticleForm[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }, [errors])

  // Load article for editing
  useEffect(() => {
    if (!editId) return
    fetch(`/api/articles/${editId}`)
      .then(r => r.json())
      .then((data: Partial<ArticleForm>) => {
        setForm(prev => ({ ...prev, ...data }))
        if (editorRef.current && data.content) {
          editorRef.current.innerHTML = data.content
          setWc(wordCount(data.content))
          setCharCount(data.content.replace(/<[^>]+>/g, '').length)
        }
      })
      .catch(console.error)
  }, [editId])

  // Click outside dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto read time
  useEffect(() => {
    setField('readTime', Math.max(1, Math.ceil(wc / 200)))
  }, [wc])

  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setField('content', html)
    setWc(wordCount(html))
    setCharCount(html.replace(/<[^>]+>/g, '').length)
  }, [setField])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.description.trim()) e.description = 'Description is required'
    if (!form.content || form.content === '<br>' || form.content.trim() === '') e.content = 'Content is required'
    if (!form.category) e.category = 'Category is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async (statusOverride?: Status) => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form, status: statusOverride ?? form.status }
      const url = editId ? `/api/articles/${editId}` : '/api/articles'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, date: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      if (!editId) {
        const data = await res.json()
        router.push(`/write?edit=${data.id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const seoScore = (() => {
    let score = 0
    if (form.seoTitle) score += 20
    if (form.metaDescription) score += 20
    if (form.focusKeyword) score += 20
    if (form.ogImage || form.image) score += 20
    if (form.canonicalUrl) score += 20
    return score
  })()

  const statusColors: Record<Status, string> = {
    draft: 'text-amber-600 bg-amber-50 border-amber-200',
    published: 'text-green-700 bg-green-50 border-green-200',
    scheduled: 'text-blue-700 bg-blue-50 border-blue-200',
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'write', label: 'Write' },
    { id: 'seo', label: 'SEO' },
    { id: 'advanced', label: 'Advanced' },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col">
      <Header />

      {/* ── Top Action Bar ── */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-4">

          {/* Tabs */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium hidden sm:block">
              {editId ? 'Editing' : 'New article'}
            </span>
            <div className="hidden sm:block w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`
                    px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150
                    ${activeTab === t.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  {t.label}
                  {t.id === 'seo' && seoScore > 0 && (
                    <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded-full font-bold ${
                      seoScore === 100 ? 'bg-green-100 text-green-700' :
                      seoScore >= 60 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {seoScore}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setPreview(p => !p)}
              className={`
                hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                border transition-all duration-150
                ${preview
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }
              `}
            >
              {preview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {preview ? 'Edit' : 'Preview'}
            </button>

            {/* Status pill */}
            <div className="relative" ref={statusRef}>
              <button
                onClick={() => setStatusOpen(o => !o)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${statusColors[form.status]}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              {statusOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {(['draft', 'published', 'scheduled'] as Status[]).map(s => (
                    <button
                      key={s}
                      onClick={() => { setField('status', s); setStatusOpen(false) }}
                      className={`
                        w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left
                        transition-colors hover:bg-gray-50
                        ${form.status === s ? 'text-red-600' : 'text-gray-700'}
                      `}
                    >
                      {form.status === s
                        ? <Check className="w-3 h-3 flex-shrink-0" />
                        : <span className="w-3 h-3 flex-shrink-0" />
                      }
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                bg-white text-gray-700 border border-gray-200 hover:border-gray-300
                transition-all duration-150 disabled:opacity-50"
            >
              {saved ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
              <span className="hidden sm:block">{saved ? 'Saved!' : 'Save draft'}</span>
            </button>

            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold
                bg-red-600 text-white hover:bg-red-700 transition-all duration-150
                disabled:opacity-50 shadow-sm"
            >
              {saving
                ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <Send className="w-3.5 h-3.5" />
              }
              <span className="hidden sm:block">{saving ? 'Saving…' : 'Publish'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        <div className="flex gap-6 lg:gap-8">

          {/* ═══ EDITOR COLUMN ═══ */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* ══ WRITE TAB ══ */}
            {activeTab === 'write' && (
              <>
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setField('title', e.target.value)}
                    placeholder="Article title…"
                    className={`
                      w-full text-3xl sm:text-4xl font-bold text-gray-900 bg-transparent
                      border-0 border-b-2 outline-none pb-4 placeholder:text-gray-200
                      transition-colors leading-tight
                      ${errors.title ? 'border-red-400' : 'border-gray-150 focus:border-red-500'}
                    `}
                    style={{ fontFamily: '"Philosopher", Georgia, serif' }}
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1.5">{errors.title}</p>}
                </div>

                {/* Excerpt / Description */}
                <div>
                  <textarea
                    value={form.description}
                    onChange={e => setField('description', e.target.value)}
                    placeholder="Write a compelling excerpt shown in previews and search results…"
                    rows={2}
                    className={`
                      w-full text-base text-gray-600 bg-white border rounded-2xl
                      outline-none px-4 py-3 placeholder:text-gray-300 resize-none
                      transition-all leading-relaxed
                      ${errors.description
                        ? 'border-red-400'
                        : 'border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-50'
                      }
                    `}
                  />
                  {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                </div>

                {/* Cover Image */}
                <Field label="Cover Image URL">
                  <div className="relative">
                    <input
                      type="url"
                      value={form.image}
                      onChange={e => setField('image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm
                        focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                    />
                    <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  </div>
                  {form.image && (
                    <div className="mt-2 relative rounded-2xl overflow-hidden border border-gray-100 bg-gray-100" style={{ height: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.image}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
                      />
                      <button
                        onClick={() => setField('image', '')}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 text-white
                          flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </Field>

                {/* Rich Editor */}
                <div>
                  <div className={`
                    border rounded-2xl overflow-hidden bg-white shadow-sm transition-all
                    ${errors.content ? 'border-red-400' : 'border-gray-200'}
                    ${!preview ? 'focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-50' : ''}
                  `}>
                    {!preview && <RichToolbar editorRef={editorRef} />}

                    {preview ? (
                      <div
                        className="px-6 py-7 min-h-[400px] prose prose-lg max-w-none
                          prose-headings:text-gray-900 prose-headings:font-bold
                          prose-a:text-red-600 prose-blockquote:border-l-red-500
                          prose-blockquote:text-gray-600 prose-strong:text-gray-900"
                        style={{ fontFamily: 'Georgia, serif' }}
                        dangerouslySetInnerHTML={{
                          __html: form.content || '<p style="color:#d1d5db;font-style:italic;">Nothing to preview yet.</p>'
                        }}
                      />
                    ) : (
                      <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleEditorInput}
                        data-placeholder="Start writing your article here…"
                        className="
                          px-6 py-7 min-h-[460px] outline-none text-gray-800 text-[17px] leading-[1.8]
                          [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3
                          [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2
                          [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4
                          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_li]:my-1
                          [&_blockquote]:border-l-4 [&_blockquote]:border-red-400
                          [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-6
                          [&_a]:text-red-600 [&_a]:underline
                          [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-6
                          [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:my-6
                          [&_pre]:text-sm [&_pre]:overflow-x-auto [&_pre]:font-mono
                        "
                        style={{ fontFamily: 'Georgia, serif' }}
                      />
                    )}
                  </div>
                  {errors.content && <p className="text-xs text-red-500 mt-1.5">{errors.content}</p>}
                  <div className="flex items-center gap-4 mt-2.5 px-1">
                    <span className="text-[11px] text-gray-400 font-medium">{wc.toLocaleString()} words</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[11px] text-gray-400">{charCount.toLocaleString()} chars</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[11px] text-gray-400">~{form.readTime} min read</span>
                  </div>
                </div>
              </>
            )}

            {/* ══ SEO TAB ══ */}
            {activeTab === 'seo' && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: '"Philosopher", Georgia, serif' }}>
                      SEO Settings
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Optimize your article for search engines and social</p>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className={`text-3xl font-bold ${
                      seoScore === 100 ? 'text-green-600' :
                      seoScore >= 60 ? 'text-amber-500' : 'text-red-500'
                    }`} style={{ fontFamily: '"Philosopher", Georgia, serif' }}>
                      {seoScore}<span className="text-lg">%</span>
                    </div>
                    <div className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mt-0.5">SEO Score</div>
                    <div className="w-20 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          seoScore === 100 ? 'bg-green-500' :
                          seoScore >= 60 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${seoScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Google preview card */}
                <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Google Preview</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-blue-700 font-medium leading-snug line-clamp-1">
                      {form.seoTitle || form.title || 'Article Title'}
                    </p>
                    <p className="text-xs text-green-700 font-medium">
                      parallaxa.com › article › {form.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40) || 'article-url'}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                      {form.metaDescription || form.description || 'Article meta description will appear here in search results…'}
                    </p>
                  </div>
                </div>

                <SectionHead>Search Appearance</SectionHead>

                <div className="space-y-5">
                  <Field label="SEO Title" hint={`${(form.seoTitle || form.title).length}/60 characters recommended`}>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.seoTitle}
                        onChange={e => setField('seoTitle', e.target.value)}
                        placeholder={form.title || 'SEO optimized title…'}
                        maxLength={80}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-14 text-sm
                          focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums ${
                        form.seoTitle.length > 60 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {form.seoTitle.length}/60
                      </span>
                    </div>
                  </Field>

                  <Field label="Meta Description" hint={`${form.metaDescription.length}/160 characters — keep under 160`}>
                    <div className="relative">
                      <textarea
                        value={form.metaDescription}
                        onChange={e => setField('metaDescription', e.target.value)}
                        placeholder="Compelling description for search snippets…"
                        rows={3}
                        maxLength={200}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 pb-7 text-sm
                          focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all resize-none bg-white"
                      />
                      <span className={`absolute right-3 bottom-3 text-[10px] font-bold tabular-nums ${
                        form.metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {form.metaDescription.length}/160
                      </span>
                    </div>
                  </Field>

                  <Field label="Focus Keyword" hint="Primary keyword to rank for — include in title, meta, and content">
                    <div className="relative">
                      <input
                        type="text"
                        value={form.focusKeyword}
                        onChange={e => setField('focusKeyword', e.target.value)}
                        placeholder="e.g. breaking world news"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-9 text-sm
                          focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                      />
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </Field>
                </div>

                <SectionHead>Social Sharing</SectionHead>

                <div className="space-y-5">
                  <Field label="Canonical URL" hint="Prevents duplicate content — leave blank to use default">
                    <div className="relative">
                      <input
                        type="url"
                        value={form.canonicalUrl}
                        onChange={e => setField('canonicalUrl', e.target.value)}
                        placeholder="https://parallaxa.com/article/…"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-9 text-sm
                          focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                      />
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </Field>

                  <Field label="OG / Social Image" hint="Recommended: 1200×630px for best social sharing">
                    <div className="relative">
                      <input
                        type="url"
                        value={form.ogImage}
                        onChange={e => setField('ogImage', e.target.value)}
                        placeholder="https://example.com/og-image.jpg"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm
                          focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                      />
                      <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    </div>
                  </Field>

                  <Field label="Twitter Card Type">
                    <div className="flex gap-2">
                      {(['summary', 'summary_large_image'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setField('twitterCard', type)}
                          className={`
                            flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border text-center transition-all
                            ${form.twitterCard === type
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }
                          `}
                        >
                          {type === 'summary' ? '📋 Summary' : '🖼 Large Image'}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* ══ ADVANCED TAB ══ */}
            {activeTab === 'advanced' && (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: '"Philosopher", Georgia, serif' }}>
                    Advanced Settings
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">Technical settings and publishing controls</p>
                </div>

                <SectionHead>Publishing Controls</SectionHead>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Visibility">
                    <div className="flex gap-2">
                      {(['public', 'private'] as Visibility[]).map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setField('visibility', v)}
                          className={`
                            flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl
                            text-xs font-semibold border transition-all
                            ${form.visibility === v
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }
                          `}
                        >
                          {v === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Scheduled Publish" hint="Automatically publish at this time">
                    <div className="relative">
                      <input
                        type="datetime-local"
                        value={form.scheduledAt}
                        onChange={e => {
                          setField('scheduledAt', e.target.value)
                          if (e.target.value) setField('status', 'scheduled')
                          else setField('status', 'draft')
                        }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-9 text-sm
                          focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </Field>
                </div>

                <SectionHead>Content Options</SectionHead>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { key: 'allowComments' as const, label: 'Allow Comments', icon: '💬', desc: 'Readers can comment' },
                    { key: 'showInRss' as const, label: 'Include in RSS', icon: '📡', desc: 'Show in feed' },
                    { key: 'ampEnabled' as const, label: 'Enable AMP', icon: '⚡', desc: 'Mobile fast load' },
                    { key: 'noIndex' as const, label: 'No Index', icon: '🚫', desc: 'Hide from search' },
                  ]).map(({ key, label, icon, desc }) => (
                    <label key={key} className={`
                      flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                      ${form[key]
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                      }
                    `}>
                      <input
                        type="checkbox"
                        checked={!!form[key]}
                        onChange={e => setField(key, e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-red-600 rounded flex-shrink-0"
                      />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{icon} {label}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <SectionHead>Technical</SectionHead>

                <div className="space-y-4">
                  <Field label="Redirect URL" hint="301 redirect visitors from this article's URL">
                    <input
                      type="url"
                      value={form.redirectUrl}
                      onChange={e => setField('redirectUrl', e.target.value)}
                      placeholder="https://…"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                        focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white"
                    />
                  </Field>

                  <Field label="Custom CSS Class" hint="Applied to the article page wrapper element">
                    <input
                      type="text"
                      value={form.cssClass}
                      onChange={e => setField('cssClass', e.target.value)}
                      placeholder="my-custom-class another-class"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                        focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all bg-white font-mono"
                    />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* ═══ RIGHT SIDEBAR ═══ */}
          <aside className="w-60 xl:w-64 flex-shrink-0 hidden md:block">
            <div className="sticky top-28 space-y-4">

              {/* Publish Card */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Publish</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[form.status]}`}>
                    {form.status}
                  </span>
                </div>
                <div className="p-4 space-y-2.5">
                  <button
                    onClick={() => handleSave('published')}
                    disabled={saving}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold
                      rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50
                      shadow-sm shadow-red-200"
                  >
                    {saving
                      ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      : <Send className="w-3.5 h-3.5" />
                    }
                    {saving ? 'Publishing…' : 'Publish Now'}
                  </button>
                  <button
                    onClick={() => handleSave('draft')}
                    disabled={saving}
                    className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold
                      rounded-xl border border-gray-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Draft
                  </button>
                </div>
              </div>

              {/* Category */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-50">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Category</span>
                </div>
                <div className="p-4">
                  <div className="relative" ref={catRef}>
                    <button
                      onClick={() => setCatOpen(o => !o)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm
                        border transition-all text-left bg-white
                        ${errors.category ? 'border-red-400' : 'border-gray-200 hover:border-gray-300'}
                        ${form.category ? 'text-gray-900 font-medium' : 'text-gray-400'}
                      `}
                    >
                      {form.category || 'Select category…'}
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${catOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {catOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                        rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto py-1">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { setField('category', cat); setCatOpen(false) }}
                            className={`
                              w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
                              ${form.category === cat
                                ? 'text-red-700 bg-red-50 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                              }
                            `}
                          >
                            {form.category === cat
                              ? <Check className="w-3 h-3 flex-shrink-0 text-red-600" />
                              : <span className="w-3 h-3 flex-shrink-0" />
                            }
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
                </div>
              </div>

              {/* Flags */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-50">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Flags</span>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  <ToggleBadge label="Featured" active={form.featured} onChange={() => setField('featured', !form.featured)} icon={<Star className="w-3 h-3" />} />
                  <ToggleBadge label="Breaking" active={form.breaking} onChange={() => setField('breaking', !form.breaking)} icon={<Zap className="w-3 h-3" />} />
                  <ToggleBadge label="Trending" active={form.trending} onChange={() => setField('trending', !form.trending)} icon={<TrendingUp className="w-3 h-3" />} />
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-50">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Stats</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { label: 'Words', value: wc.toLocaleString(), icon: <BarChart2 className="w-3.5 h-3.5" /> },
                    { label: 'Read time', value: `${form.readTime} min`, icon: <Clock className="w-3.5 h-3.5" /> },
                    { label: 'SEO score', value: `${seoScore}%`, icon: <Globe className="w-3.5 h-3.5" /> },
                    { label: 'RSS', value: form.showInRss ? 'On' : 'Off', icon: <Rss className="w-3.5 h-3.5" /> },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="text-gray-400">{icon}</span>
                        {label}
                      </div>
                      <span className="text-xs font-bold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-[#FAFAF7] border border-gray-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Writing tips</p>
                <ul className="space-y-2">
                  {[
                    'Use H2/H3 headings to structure content',
                    'Aim for 300+ words for SEO',
                    'Add a focus keyword in SEO tab',
                    'Include OG image for social sharing',
                  ].map((tip, i) => (
                    <li key={i} className="text-[11px] text-gray-500 leading-snug flex gap-1.5">
                      <span className="text-red-400 flex-shrink-0">›</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm
        border-t border-gray-200 flex items-center gap-2 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">{form.title || 'Untitled article'}</p>
          <p className="text-[10px] text-gray-400">{wc} words · {form.status}</p>
        </div>
        <button
          onClick={() => handleSave('draft')}
          className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200
            text-gray-700 bg-white flex items-center gap-1.5"
        >
          <Save className="w-3 h-3" /> Save
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white
            flex items-center gap-1.5 disabled:opacity-50"
        >
          <Send className="w-3 h-3" /> Publish
        </button>
      </div>

      <div className="pb-16 md:pb-0" />
      <Footer />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #d1d5db;
          font-style: italic;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}