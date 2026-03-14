'use client'

import { useState, useEffect, useCallback, useRef ,Suspense} from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import {
  ArrowLeft, Save, Send, Eye,
  Image as ImageIcon, Tag, Star, Zap,
  TrendingUp, AlignLeft, Check, AlertCircle
} from 'lucide-react'

const CATEGORIES = ['Business', 'Technology', 'Sports', 'Entertainment', 'Science', 'Health']

interface FormState {
  title: string; description: string; content: string
  category: string; image: string
  featured: boolean; breaking: boolean; trending: boolean
}

const EMPTY: FormState = {
  title: '', description: '', content: '',
  category: '', image: '',
  featured: false, breaking: false, trending: false,
}

type Status = 'idle' | 'saving' | 'saved' | 'publishing' | 'published' | 'error'

function WritePageContent() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')

  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [wordCount, setWordCount] = useState(0)
  const [readTime, setReadTime] = useState(1)
  const [preview, setPreview] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (authStatus === 'unauthenticated') router.push('/auth/signin')
  }, [authStatus, router])

  useEffect(() => {
    if (!editId) return
    fetch(`/api/articles/${editId}`)
      .then(r => r.json())
      .then(data => {
        setForm({
          title: data.title ?? '', description: data.description ?? '',
          content: data.content ?? '', category: data.category ?? '',
          image: data.image ?? '', featured: data.featured ?? false,
          breaking: data.breaking ?? false, trending: data.trending ?? false,
        })
        const words = (data.content ?? '').trim().split(/\s+/).filter(Boolean).length
        setWordCount(words); setReadTime(Math.max(1, Math.ceil(words / 200)))
      }).catch(console.error)
  }, [editId])

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [form.title])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
    if (key === 'content') {
      const words = (value as string).trim().split(/\s+/).filter(Boolean).length
      setWordCount(words); setReadTime(Math.max(1, Math.ceil(words / 200)))
    }
  }, [])

  const validate = () => {
    const e: typeof errors = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.description.trim()) e.description = 'Description is required'
    if (!form.content.trim()) e.content = 'Content is required'
    if (!form.category) e.category = 'Select a category'
    setErrors(e); return Object.keys(e).length === 0
  }

  const submit = async (publish: boolean) => {
    if (!validate()) return
    setStatus(publish ? 'publishing' : 'saving')
    try {
      const payload = { ...form, readTime, date: new Date().toISOString() }
      const res = editId
        ? await fetch(`/api/articles/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      const article = await res.json()
      setStatus(publish ? 'published' : 'saved')
      if (publish) setTimeout(() => router.push(`/article/${article.slug}`), 1000)
      else setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error'); setTimeout(() => setStatus('idle'), 3000)
    }
  }

  if (authStatus === 'loading' || !session?.user) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-pulse text-gray-400 text-sm">Loading…</div></div>
  }

  const statusMeta: Record<Status, { label: string; cls: string }> = {
    idle:       { label: 'Draft',        cls: 'border-gray-200 text-gray-500' },
    saving:     { label: 'Saving…',      cls: 'border-yellow-300 text-yellow-700 bg-yellow-50 animate-pulse' },
    saved:      { label: 'Saved ✓',      cls: 'border-green-300 text-green-700 bg-green-50' },
    publishing: { label: 'Publishing…',  cls: 'border-yellow-300 text-yellow-700 bg-yellow-50 animate-pulse' },
    published:  { label: 'Published! ✓', cls: 'border-green-300 text-green-700 bg-green-50' },
    error:      { label: 'Error',        cls: 'border-red-300 text-red-700 bg-red-50' },
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      {/* Top bar */}
      <div className="sticky top-[65px] z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="text-gray-200">|</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusMeta[status].cls}`}>
              {statusMeta[status].label}
            </span>
            {wordCount > 0 && (
              <span className="text-xs text-gray-400 hidden sm:inline">{wordCount} words · {readTime} min read</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${preview ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Eye className="w-4 h-4" /><span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => submit(false)}
              disabled={['saving','publishing'].includes(status)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /><span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={() => submit(true)}
              disabled={['saving','publishing','published'].includes(status)}
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />{editId ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {preview ? (
          /* ── PREVIEW ── */
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-red-600 bg-red-50 px-3 py-1 rounded">
                {form.category || 'Category'}
              </span>
            </div>
            {form.image && (
              <div className="relative w-full h-72 bg-gray-100 rounded-xl overflow-hidden mb-8">
                <img src={form.image} alt="cover" className="w-full h-full object-cover" />
              </div>
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {form.title || <span className="text-gray-300">Your title here…</span>}
            </h1>
            <p className="text-xl text-gray-500 mb-6 leading-relaxed">
              {form.description || <span className="text-gray-300">Description…</span>}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400 border-b border-gray-100 pb-6 mb-8">
              <span className="font-medium text-gray-700">{session.user.name}</span>
              <span>·</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span>·</span>
              <span>{readTime} min read</span>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
              {form.content || <span className="text-gray-300">Your content here…</span>}
            </div>
          </div>
        ) : (
          /* ── EDITOR ── */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main editor */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <textarea
                  ref={titleRef}
                  rows={1}
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  placeholder="Article title…"
                  className="w-full text-4xl font-bold text-gray-900 placeholder-gray-200 bg-transparent border-none outline-none resize-none leading-tight overflow-hidden"
                />
                {errors.title && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
              </div>

              <div>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder="Short description or subtitle…"
                  className="w-full text-lg text-gray-500 placeholder-gray-200 bg-transparent border-none outline-none resize-none leading-relaxed"
                />
                {errors.description && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
              </div>

              <hr className="border-gray-100" />

              <div>
                <textarea
                  rows={28}
                  value={form.content}
                  onChange={e => setField('content', e.target.value)}
                  placeholder={`Start writing your article here…\n\nTell the story. Share the facts. Give your readers something worth reading.`}
                  className="w-full text-base text-gray-700 placeholder-gray-300 bg-transparent border-none outline-none resize-none leading-relaxed"
                  style={{ fontFamily: 'Georgia, serif' }}
                />
                {errors.content && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle className="w-3 h-3" />{errors.content}</p>}
              </div>
            </div>

            {/* Settings sidebar */}
            <div className="space-y-5">

              {/* Category */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  <Tag className="w-3.5 h-3.5" /> Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setField('category', cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.category === cat ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                {errors.category && <p className="flex items-center gap-1 text-xs text-red-500 mt-2"><AlertCircle className="w-3 h-3" />{errors.category}</p>}
              </div>

              {/* Cover image */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  <ImageIcon className="w-3.5 h-3.5" /> Cover Image URL
                </h3>
                <input type="url" value={form.image} onChange={e => setField('image', e.target.value)}
                  placeholder="https://images.unsplash.com/…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-black" />
                {form.image && (
                  <div className="mt-3 w-full h-28 bg-gray-100 rounded-lg overflow-hidden">
                    <img src={form.image} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>

              {/* Flags */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                  <AlignLeft className="w-3.5 h-3.5" /> Article Flags
                </h3>
                <div className="space-y-3">
                  {([
                    { key: 'featured' as const, label: 'Featured', icon: Star, desc: 'Show on homepage featured section' },
                    { key: 'breaking' as const, label: 'Breaking News', icon: Zap, desc: 'Mark as breaking news alert' },
                    { key: 'trending' as const, label: 'Trending', icon: TrendingUp, desc: 'Include in trending section' },
                  ]).map(({ key, label, icon: Icon, desc }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer" onClick={() => setField(key, !form[key])}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 border-2 transition-colors ${form[key] ? 'bg-black border-black' : 'border-gray-300 hover:border-gray-500'}`}>
                        {form[key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Author */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Author</h3>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {session.user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
                    <p className="text-xs text-gray-400">{session.user.email}</p>
                  </div>
                </div>
              </div>

              {/* Status messages */}
              {status === 'error' && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> Something went wrong. Please try again.
                </div>
              )}
              {(status === 'saved' || status === 'published') && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {status === 'published' ? 'Published! Redirecting…' : 'Draft saved.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WritePage (){
  return (
    <Suspense fallback = {(<>loading...</>)}>
      <WritePageContent/>
      </Suspense>
  )
}