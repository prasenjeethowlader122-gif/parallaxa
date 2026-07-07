'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import {
  Trash, Check, Copy, Sparkle, Plus, WarningCircle, X, MagnifyingGlass,
  Lightbulb, Info, Quotes, ChartBar, Image, Book, Note, Table,
  PlayCircle, Palette, Notebook, CaretDown, CirclesFour, Package,
  PencilSimple, Code, Eye, FloppyDisk, CircleNotch, ShareNetwork
} from '@phosphor-icons/react/dist/ssr'

interface BlockParam {
  name: string
  label: string
  placeholder: string
  defaultValue: string
}

interface CustomBlock {
  id: number
  name: string
  label: string
  description: string
  icon: string
  params: BlockParam[]
  htmlTemplate: string
  isBuiltin: boolean
  createdAt: string
  updatedAt: string
}

const BUILTIN_BLOCKS = [
  { name: 'embed', label: 'Social Embed', icon: ShareNetwork, description: 'Facebook, Twitter, YouTube, Instagram, Reddit, Vimeo embed করুন', usage: '[!embed(url="https://...")]' },
  { name: 'screenshot', label: 'Screenshot', icon: Image, description: 'সোশ্যাল মিডিয়া পোস্ট বা ওয়েবসাইটের স্ক্রিনশট দেখান', usage: '[!screenshot(url="https://...")]' },
  { name: 'infobox', label: 'InfoBox', icon: Info, description: 'গুরুত্বপূর্ণ তথ্য বা সতর্কতা দেখান', usage: '[!infobox(title="Title" content="Message" type="info")]' },
  { name: 'reference', label: 'Reference', icon: Book, description: 'তথ্যসূত্র বা সাইটেশন যোগ করুন', usage: '[!reference(text="Title" author="Name")]' },
  { name: 'tika', label: 'Tika (Note)', icon: Note, description: 'টিকা বা নোট যোগ করুন', usage: '[!tika(text="এখানে লিখুন...")]' },
  { name: 'table', label: 'Styled Table', icon: Table, description: 'সুন্দরভাবে তথ্য সাজিয়ে টেবিল তৈরি করুন', usage: '[!table(headers="Name,Age" rows="John,25|Jane,22")]' },
  { name: 'run', label: 'Run Code', icon: PlayCircle, description: 'Custom HTML/JS code চালান', usage: '[!run(code="<b>Hello</b>")]' },
  { name: 'style', label: 'Custom CSS', icon: Palette, description: 'Article-এ custom CSS যোগ করুন', usage: '[!style(css=".myclass { color: red }")]' },
  { name: 'verse', label: 'Religious Verse', icon: Notebook, description: 'ধর্মীয় শ্লোক বা আয়াত হাইলাইট করুন', usage: '[!verse(text="..." source="..." reference="...")]' },
  { name: 'chart', label: 'Chart/Graph', icon: ChartBar, description: 'তথ্য দিয়ে চার্ট বা গ্রাফ তৈরি করুন', usage: '[!chart(type="bar" title="..." labels="..." values="...")]' },
]

const PRESET_TEMPLATES = [
  {
    icon: Lightbulb,
    name: 'callout',
    label: 'Callout Box',
    description: 'সাধারণ তথ্য বাক্স',
    params: [
      { name: 'text', label: 'বার্তা', placeholder: 'এখানে লিখুন…', defaultValue: '' },
      { name: 'type', label: 'ধরন (info/warning/success)', placeholder: 'info', defaultValue: 'info' },
    ],
    htmlTemplate: `<div class="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 sm:px-5 sm:py-4 text-sm sm:text-[15px] leading-6 text-slate-800 shadow-sm">
  {{text}}
</div>`,
  },
  {
    icon: WarningCircle,
    name: 'warning',
    label: 'Warning Box',
    description: 'সতর্কতা বাক্স',
    params: [
      { name: 'text', label: 'সতর্কতা', placeholder: 'সতর্কতার বার্তা…', defaultValue: '' },
    ],
    htmlTemplate: `<div class="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 text-sm sm:text-[15px] leading-6 text-amber-900 shadow-sm">
  <strong>সতর্কতা:</strong> {{text}}
</div>`,
  },
  {
    icon: Info,
    name: 'fact',
    label: 'Fact Box',
    description: 'তথ্য বাক্স — তথ্য ও উৎস সহ',
    params: [
      { name: 'text', label: 'তথ্য', placeholder: 'গুরুত্বপূর্ণ তথ্য…', defaultValue: '' },
      { name: 'source', label: 'উৎস', placeholder: 'উৎস প্রতিষ্ঠান', defaultValue: '' },
    ],
    htmlTemplate: `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 shadow-sm">
  <div class="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">তথ্য</div>
  <p class="m-0 mb-2 text-sm sm:text-base leading-7 text-slate-900">{{text}}</p>
  <div class="text-[11px] text-slate-400">— উৎস: {{source}}</div>
</div>`,
  },
  {
    icon: Quotes,
    name: 'pullquote',
    label: 'Pull Quote',
    description: 'বড় উদ্ধৃতি হাইলাইট',
    params: [
      { name: 'text', label: 'উদ্ধৃতি', placeholder: 'উদ্ধৃতি লিখুন…', defaultValue: '' },
      { name: 'author', label: 'ব্যক্তি/উৎস', placeholder: 'নাম বা পদ', defaultValue: '' },
    ],
    htmlTemplate: `<blockquote class="rounded-2xl border-l-4 border-red-500 bg-red-50 px-5 py-5 sm:px-6 sm:py-6 shadow-sm">
  <p class="m-0 mb-3 font-serif text-lg sm:text-xl italic leading-8 text-red-900">"{{text}}"</p>
  <cite class="text-xs sm:text-sm not-italic font-semibold text-red-700">— {{author}}</cite>
</blockquote>`,
  },
  {
    icon: ChartBar,
    name: 'stat',
    label: 'Stat Highlight',
    description: 'বড় সংখ্যা/তথ্য হাইলাইট',
    params: [
      { name: 'number', label: 'সংখ্যা/তথ্য', placeholder: '৫,০০০', defaultValue: '' },
      { name: 'label', label: 'বিবরণ', placeholder: 'নিহত মানুষ', defaultValue: '' },
      { name: 'source', label: 'উৎস', placeholder: 'জাতিসংঘ', defaultValue: '' },
    ],
    htmlTemplate: `<div class="my-5 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 px-5 py-7 sm:px-6 sm:py-8 text-center shadow-sm">
  <div class="mb-2 text-4xl sm:text-5xl font-black leading-none text-slate-900">{{number}}</div>
  <div class="mb-1 text-sm sm:text-[15px] font-medium text-slate-500">{{label}}</div>
  <div class="text-[11px] text-slate-400">সূত্র: {{source}}</div>
</div>`,
  },
]

function ParamRow({
  param,
  index,
  onChange,
  onRemove,
}: {
  param: BlockParam
  index: number
  onChange: (index: number, field: keyof BlockParam, val: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">নাম (code)</label>
          <input
            value={param.name}
            onChange={e => onChange(index, 'name', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="param_name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">লেবেল</label>
          <input
            value={param.label}
            onChange={e => onChange(index, 'label', e.target.value)}
            placeholder="Parameter Label"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Placeholder</label>
          <input
            value={param.placeholder}
            onChange={e => onChange(index, 'placeholder', e.target.value)}
            placeholder="উদাহরণ মান…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Default মান</label>
          <input
            value={param.defaultValue}
            onChange={e => onChange(index, 'defaultValue', e.target.value)}
            placeholder="ডিফল্ট মান…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onRemove(index)}
          aria-label={`Remove parameter ${param.name || index + 1}`}
          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-white hover:text-red-500"
        >
          <Trash size={16} /> Remove
        </button>
      </div>
    </div>
  )
}

function LivePreview({ template, params }: { template: string; params: BlockParam[] }) {
  const rendered = params.reduce((html, p) => {
    const val = p.defaultValue || p.placeholder || `(${p.name})`
    return html.replace(new RegExp(`\\{\\{${p.name}\\}\\}`, 'g'), val)
  }, template).replace(/\{\{[^}]+\}\}/g, '')

  if (!template.trim()) {
    return (
      <div className="flex h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm italic text-slate-400">
        Template লিখুন preview দেখতে
      </div>
    )
  }

  return (
    <div
      className="min-h-[80px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}

function SyntaxUsage({ name, params }: { name: string; params: BlockParam[] }) {
  const [copied, setCopied] = useState(false)
  const usage = `[!${name || 'blockname'}(${params.map(p => `${p.name}="${p.defaultValue || p.placeholder || '...'}"`).join(' ')})]`

  const copy = async () => {
    await navigator.clipboard.writeText(usage)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 shadow-sm">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-emerald-400">{usage}</code>
      <button
        onClick={copy}
        aria-label="Copy usage"
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  )
}

export default function BlockManagerPage() {
  const [blocks, setBlocks] = useState<CustomBlock[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [expandedBuiltin, setExpandedBuiltin] = useState(false)
  const [copiedSyntax, setCopiedSyntax] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit')

  const [form, setForm] = useState({
    name: '',
    label: '',
    description: '',
    icon: 'CirclesFour',
    params: [] as BlockParam[],
    htmlTemplate: '',
  })

  const fetchBlocks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/blocks?user=1')
      const data = await res.json()
      setBlocks(Array.isArray(data) ? data : [])
    } catch {
      setError('ব্লক লোড করতে সমস্যা হয়েছে')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBlocks()
  }, [fetchBlocks])

  const resetForm = () =>
    setForm({
      name: '',
      label: '',
      description: '',
      icon: 'CirclesFour',
      params: [],
      htmlTemplate: '',
    })

  const openEdit = (block: CustomBlock) => {
    setForm({
      name: block.name,
      label: block.label,
      description: block.description,
      icon: block.icon,
      params: block.params,
      htmlTemplate: block.htmlTemplate,
    })
    setEditingId(block.id)
    setPreviewTab('edit')
  }

  const openNew = () => {
    resetForm()
    setEditingId('new')
    setPreviewTab('edit')
    setError(null)
  }

  const loadPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setForm({
      name: preset.name,
      label: preset.label,
      description: preset.description,
      icon: preset.icon || 'extension',
      params: preset.params.map(p => ({ ...p })),
      htmlTemplate: preset.htmlTemplate,
    })
    setEditingId('new')
    setShowPresets(false)
    setPreviewTab('edit')
    setError(null)
  }

  const save = async () => {
    if (!form.name || !form.label || !form.htmlTemplate) {
      setError('নাম, লেবেল ও HTML template আবশ্যক')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const isNew = editingId === 'new'
      const url = isNew ? '/api/blocks' : `/api/blocks/${editingId}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'সেভ করতে ব্যর্থ')
      await fetchBlocks()
      setEditingId(null)
      resetForm()
    } catch (e: any) {
      setError(e.message || 'সেভ করতে সমস্যা হয়েছে')
    } finally {
      setSaving(false)
    }
  }

  const deleteBlock = async (id: number) => {
    if (!confirm('এই ব্লকটি মুছে দেবেন?')) return
    try {
      const res = await fetch(`/api/blocks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('মুছতে সমস্যা')
      await fetchBlocks()
    } catch {
      setError('ব্লক মুছতে সমস্যা হয়েছে')
    }
  }

  const addParam = () => {
    setForm(f => ({
      ...f,
      params: [...f.params, { name: '', label: '', placeholder: '', defaultValue: '' }],
    }))
  }

  const updateParam = (i: number, field: keyof BlockParam, val: string) => {
    setForm(f => {
      const params = [...f.params]
      params[i] = { ...params[i], [field]: val }
      return { ...f, params }
    })
  }

  const removeParam = (i: number) => {
    setForm(f => ({ ...f, params: f.params.filter((_, idx) => idx !== i) }))
  }

  const copyUsage = (name: string, params: BlockParam[]) => {
    const usage = `[!${name}(${params.map(p => `${p.name}="${p.defaultValue || '...'}"`).join(' ')})]`
    navigator.clipboard.writeText(usage)
    setCopiedSyntax(name)
    setTimeout(() => setCopiedSyntax(null), 1500)
  }

  const isEditing = editingId !== null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Block Manager
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              নতুন block তৈরি করুন, সম্পাদনা করুন, মুছুন
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPresets(p => !p)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Sparkle size={18} />
              Presets
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={18} />
              নতুন Block
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <WarningCircle size={20} className="shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-red-400 transition hover:bg-white hover:text-red-600"
              aria-label="Close error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
             <MagnifyingGlass size={20} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ব্লক খুঁজুন (নাম বা লেবেল দিয়ে)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
          />
        </div>

        {showPresets && (
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Preset Templates</h2>
              <button
                onClick={() => setShowPresets(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                aria-label="Close presets"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {PRESET_TEMPLATES.map(p => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-center transition hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-lg"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white">
                    <p.icon size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-900">{p.label}</span>
                  <span className="text-[10px] leading-tight text-slate-500 font-medium">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`grid gap-8 ${isEditing ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
          <div className={isEditing ? 'lg:col-span-2' : 'col-span-1'}>
            <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedBuiltin(e => !e)}
                aria-expanded={expandedBuiltin}
                className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Book size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-950">Built-in Blocks</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{BUILTIN_BLOCKS.length}টি ডিফল্ট ব্লক</p>
                  </div>
                </div>
                <CaretDown className="text-slate-400 transition-transform duration-300" style={{ transform: expandedBuiltin ? 'rotate(180deg)' : 'none' }} />
              </button>

              {expandedBuiltin && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/30">
                  {BUILTIN_BLOCKS.map(b => (
                    <div key={b.name} className="px-5 py-4 hover:bg-white transition-colors">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                           <b.icon size={20} className="text-slate-600" />
                          <span className="truncate text-sm font-bold text-slate-900">{b.label}</span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(b.usage)
                            setCopiedSyntax(b.name)
                            setTimeout(() => setCopiedSyntax(null), 1500)
                          }}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                          aria-label={`Copy ${b.name} usage`}
                        >
                          {copiedSyntax === b.name ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                      <p className="text-[11px] leading-5 text-slate-500 font-medium">{b.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                   <CirclesFour size={20} className="text-slate-500" />
                  <span className="text-sm font-bold text-slate-950">আমার Blocks</span>
                </div>
                {loading && <CircleNotch className="text-lg animate-spin text-slate-400" />}
              </div>

              {!loading && blocks.length === 0 ? (
                <div className="px-5 py-20 text-center">
                  <div className="mb-4 flex justify-center">
                    <Package size={64} className="text-slate-200" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">এখনো কোনো custom block নেই</p>
                  <button
                    onClick={openNew}
                    className="mt-4 text-xs font-bold text-slate-950 underline decoration-slate-300 underline-offset-4"
                  >
                    প্রথম block তৈরি করুন
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blocks.filter(b =>
                    b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(block => (
                    <div
                      key={block.id}
                      className={`px-5 py-4 transition ${
                        editingId === block.id ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm text-xl">
                           {(() => {
                             const Icon = (p => {
                               switch(p) {
                                 case 'share': return ShareNetwork;
                                 case 'terminal': return Code;
                                 case 'palette': return Palette;
                                 case 'play_circle': return PlayCircle;
                                 case 'info': return Info;
                                 case 'warning': return WarningCircle;
                                 case 'lightbulb': return Lightbulb;
                                 case 'format_quote': return Quotes;
                                 case 'bar_chart': return ChartBar;
                                 case 'image': return Image;
                                 case 'book': return Book;
                                 case 'sticky_note_2': return Note;
                                 case 'table_chart': return Table;
                                 case 'menu_book': return Notebook;
                                 default: return CirclesFour;
                               }
                             })(block.icon);
                             return <Icon size={20} />;
                           })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{block.label}</span>
                            <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                              {block.name}
                            </code>
                          </div>
                          {block.description && (
                            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 font-medium">
                              {block.description}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {block.params.length} parameters
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => copyUsage(block.name, block.params)}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            {copiedSyntax === block.name ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                          <button
                            onClick={() => openEdit(block)}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                          >
                            <PencilSimple size={16} />
                          </button>
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="lg:col-span-3">
              <div className="sticky top-20 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-950">
                    {editingId === 'new' ? 'নতুন Block তৈরি' : 'Block সম্পাদনা'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      resetForm()
                      setError(null)
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="max-h-[calc(100vh-220px)] overflow-y-auto p-6 sm:p-8">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr_1fr]">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Icon</label>
                      <select
                        value={form.icon}
                        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-slate-900/10 appearance-none cursor-pointer"
                      >
                        {[
                          { val: 'share', label: 'Share' },
                          { val: 'terminal', label: 'Code' },
                          { val: 'palette', label: 'Palette' },
                          { val: 'extension', label: 'Extension' },
                          { val: 'play_circle', label: 'Play' },
                          { val: 'info', label: 'Info' },
                          { val: 'warning', label: 'Warning' },
                          { val: 'lightbulb', label: 'Lightbulb' },
                          { val: 'format_quote', label: 'Quote' },
                          { val: 'bar_chart', label: 'Chart' },
                          { val: 'image', label: 'Image' },
                          { val: 'book', label: 'Book' },
                          { val: 'sticky_note_2', label: 'Note' },
                          { val: 'table_chart', label: 'Table' },
                          { val: 'menu_book', label: 'Notebook' }
                        ].map(icon => (
                          <option key={icon.val} value={icon.val}>{icon.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Block ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                        placeholder="callout"
                        disabled={editingId !== 'new'}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-mono font-bold outline-none transition focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Display লেবেল <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.label}
                        onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                        placeholder="Callout Box"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">বিবরণ</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="এই block কী করে?"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Parameters
                      </label>
                      <button
                        onClick={addParam}
                        className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-950 bg-slate-100 transition hover:bg-slate-200"
                      >
                        <Plus size={14} /> যোগ করুন
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      {form.params.map((p, i) => (
                        <ParamRow
                          key={i}
                          param={p}
                          index={i}
                          onChange={updateParam}
                          onRemove={removeParam}
                        />
                      ))}

                      {form.params.length === 0 && (
                        <div className="py-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                           <p className="text-xs italic text-slate-400 font-medium">কোনো parameter নেই — static HTML block তৈরি করতে পারেন</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        HTML Template <span className="text-red-500">*</span>
                      </label>

                      <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                        <button
                          onClick={() => setPreviewTab('edit')}
                          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            previewTab === 'edit' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <Code size={14} /> কোড
                        </button>
                        <button
                          onClick={() => setPreviewTab('preview')}
                          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            previewTab === 'preview' ? 'bg-slate-950 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <Eye size={14} /> Preview
                        </button>
                      </div>
                    </div>

                    {previewTab === 'edit' ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-inner">
                        <CodeMirror
                          value={form.htmlTemplate}
                          height="320px"
                          extensions={[html()]}
                          onChange={(value) => setForm(f => ({ ...f, htmlTemplate: value }))}
                          theme="light"
                          className="text-xs"
                        />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                        <LivePreview template={form.htmlTemplate} params={form.params} />
                      </div>
                    )}
                  </div>

                  {form.name && (
                    <div className="mt-8">
                      <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Syntax Usage
                      </label>
                      <SyntaxUsage name={form.name} params={form.params} />
                    </div>
                  )}

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                    <button
                      onClick={() => {
                        setEditingId(null)
                        resetForm()
                        setError(null)
                      }}
                      className="w-full rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-1 uppercase tracking-widest"
                    >
                      বাতিল
                    </button>
                    <button
                      onClick={save}
                      disabled={saving || !form.name || !form.label || !form.htmlTemplate}
                      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1 shadow-xl shadow-slate-950/20 uppercase tracking-widest"
                    >
                      {saving ? <CircleNotch className="animate-spin text-lg" /> : <FloppyDisk size={18} />}
                      {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
