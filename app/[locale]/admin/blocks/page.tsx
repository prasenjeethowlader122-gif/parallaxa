'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import CodeMirror from '@uiw/react-codemirror'
import { html } from '@codemirror/lang-html'
import {
  Plus, Trash2, Edit3, Save, X, Copy, Check, ChevronDown,
  ChevronUp, Info, Puzzle, Code2, Eye, RefreshCw, AlertCircle,
  Sparkles, BookOpen, Terminal, Share2, Play, Palette,
  Lightbulb, AlertTriangle, Info as InfoIcon, Quote, BarChart3,
  Box, Search, Book, StickyNote, Table as TableIcon
} from 'lucide-react'

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
  { name: 'embed', label: 'Social Embed', icon: Share2, description: 'Facebook, Twitter, YouTube, Instagram, Reddit, Vimeo embed করুন', usage: '[!embed(url="https://...")]' },
  { name: 'screenshot', label: 'Screenshot', icon: Eye, description: 'সোশ্যাল মিডিয়া পোস্ট বা ওয়েবসাইটের স্ক্রিনশট দেখান', usage: '[!screenshot(url="https://...")]' },
  { name: 'infobox', label: 'InfoBox', icon: InfoIcon, description: 'গুরুত্বপূর্ণ তথ্য বা সতর্কতা দেখান', usage: '[!infobox(title="Title" content="Message" type="info")]' },
  { name: 'reference', label: 'Reference', icon: Book, description: 'তথ্যসূত্র বা সাইটেশন যোগ করুন', usage: '[!reference(text="Title" author="Name")]' },
  { name: 'tika', label: 'Tika (Note)', icon: StickyNote, description: 'টিকা বা নোট যোগ করুন', usage: '[!tika(text="এখানে লিখুন...")]' },
  { name: 'table', label: 'Styled Table', icon: TableIcon, description: 'সুন্দরভাবে তথ্য সাজিয়ে টেবিল তৈরি করুন', usage: '[!table(headers="Name,Age" rows="John,25|Jane,22")]' },
  { name: 'run', label: 'Run Code', icon: Play, description: 'Custom HTML/JS code চালান', usage: '[!run(code="<b>Hello</b>")]' },
  { name: 'style', label: 'Custom CSS', icon: Palette, description: 'Article-এ custom CSS যোগ করুন', usage: '[!style(css=".myclass { color: red }")]' },
]

const PRESET_TEMPLATES = [
  {
    icon: Lightbulb,
    iconName: 'lightbulb',
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
    icon: AlertTriangle,
    iconName: 'warning',
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
    icon: InfoIcon,
    iconName: 'info',
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
    icon: Quote,
    iconName: 'quote',
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
    icon: BarChart3,
    iconName: 'stat',
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
  {
    icon: InfoIcon,
    iconName: 'info',
    name: 'infobox',
    label: 'Info Box (New)',
    description: 'নতুন স্টাইলিশ ইনফো বক্স',
    params: [
      { name: 'title', label: 'শিরোনাম', placeholder: 'Quick Facts', defaultValue: 'Quick Facts' },
      { name: 'content', label: 'বিস্তারিত', placeholder: 'এখানে লিখুন…', defaultValue: '' },
      { name: 'type', label: 'টাইপ (info/warning)', placeholder: 'info', defaultValue: 'info' },
    ],
    htmlTemplate: `<div class="my-6 p-5 rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
  <div class="flex items-center gap-2 mb-2">
    <h4 class="text-sm font-bold text-gray-900">{{title}}</h4>
  </div>
  <div class="text-sm leading-relaxed text-gray-800">
    {{content}}
  </div>
</div>`,
  },
  {
    icon: Book,
    iconName: 'book',
    name: 'reference',
    label: 'Reference (New)',
    description: 'নতুন স্টাইলিশ রেফারেন্স',
    params: [
      { name: 'text', label: 'শিরোনাম', placeholder: 'Source Title', defaultValue: '' },
      { name: 'author', label: 'লেখক', placeholder: 'Author Name', defaultValue: '' },
      { name: 'year', label: 'বছর', placeholder: '2024', defaultValue: '' },
      { name: 'url', label: 'URL', placeholder: 'https://...', defaultValue: '' },
    ],
    htmlTemplate: `<div class="my-4 p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
  <div class="text-xs text-gray-600 italic">
    <span class="font-bold text-gray-900 not-italic">{{author}}</span> ({{year}}).
    <a href="{{url}}" target="_blank" rel="noopener noreferrer" class="mx-1 text-blue-600 hover:underline">
      {{text}}
    </a>
  </div>
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
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">নাম (code)</label>
          <input
            value={param.name}
            onChange={e => onChange(index, 'name', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="param_name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">লেবেল</label>
          <input
            value={param.label}
            onChange={e => onChange(index, 'label', e.target.value)}
            placeholder="Parameter Label"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Placeholder</label>
          <input
            value={param.placeholder}
            onChange={e => onChange(index, 'placeholder', e.target.value)}
            placeholder="উদাহরণ মান…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Default মান</label>
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
          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-white hover:text-red-500"
        >
          <X size={14} /> Remove
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
        {copied ? <Check size={14} /> : <Copy size={14} />}
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
    icon: 'extension',
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
      icon: 'extension',
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
      icon: preset.iconName || 'extension',
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

  const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    const iconMap: Record<string, any> = {
      share: Share2,
      terminal: Terminal,
      palette: Palette,
      extension: Box,
      play: Play,
      info: InfoIcon,
      warning: AlertTriangle,
      lightbulb: Lightbulb,
      quote: Quote,
      stat: BarChart3,
      image: Eye,
      book: Book,
      sticky_note_2: StickyNote,
      table_chart: TableIcon,
    }
    const Icon = iconMap[name] || Box
    return <Icon className={className} size={18} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-['Newsreader'] text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Custom Block Manager
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              নতুন block তৈরি করুন, সম্পাদনা করুন, মুছুন
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPresets(p => !p)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <Sparkles size={14} />
              Preset
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={14} />
              নতুন Block
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="rounded-lg p-1 text-red-400 transition hover:bg-white hover:text-red-600"
              aria-label="Close error"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="ব্লক খুঁজুন (নাম বা লেবেল দিয়ে)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
          />
        </div>

        {showPresets && (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Preset Templates</h2>
              <button
                onClick={() => setShowPresets(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                aria-label="Close presets"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {PRESET_TEMPLATES.map(p => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white">
                    <p.icon size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-900">{p.label}</span>
                  <span className="text-[10px] leading-tight text-slate-500">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${isEditing ? 'grid-cols-1 lg:grid-cols-5' : 'grid-cols-1'}`}>
          <div className={isEditing ? 'lg:col-span-2' : 'col-span-1'}>
            <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => setExpandedBuiltin(e => !e)}
                aria-expanded={expandedBuiltin}
                className="flex w-full items-center justify-between px-4 py-4 transition hover:bg-slate-50 sm:px-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <BookOpen size={14} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">Built-in Blocks</p>
                    <p className="text-[10px] text-slate-500">{BUILTIN_BLOCKS.length}টি বিল্ট-ইন ব্লক</p>
                  </div>
                </div>
                {expandedBuiltin ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>

              {expandedBuiltin && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {BUILTIN_BLOCKS.map(b => (
                    <div key={b.name} className="px-4 py-3 sm:px-5">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <b.icon size={16} className="text-slate-600" />
                          <span className="truncate text-sm font-semibold text-slate-900">{b.label}</span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">built-in</span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(b.usage)
                            setCopiedSyntax(b.name)
                            setTimeout(() => setCopiedSyntax(null), 1500)
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                          aria-label={`Copy ${b.name} usage`}
                        >
                          {copiedSyntax === b.name ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <p className="text-[11px] leading-5 text-slate-500">{b.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <Puzzle size={14} className="text-slate-500" />
                  <span className="text-sm font-semibold text-slate-900">আমার Blocks</span>
                </div>
                {loading && <RefreshCw size={13} className="animate-spin text-slate-400" />}
              </div>

              {!loading && blocks.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mb-3 flex justify-center">
                    <Box size={40} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500">এখনো কোনো custom block নেই</p>
                  <button
                    onClick={openNew}
                    className="mt-4 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4"
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
                      className={`px-4 py-3.5 sm:px-5 transition ${
                        editingId === block.id ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
                          <DynamicIcon name={block.icon} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{block.label}</span>
                            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                              {block.name}
                            </code>
                          </div>
                          {block.description && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                              {block.description}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400">
                            {block.params.length}টি parameter
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => copyUsage(block.name, block.params)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Copy usage for ${block.label}`}
                          >
                            {copiedSyntax === block.name ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => openEdit(block)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label={`Edit ${block.label}`}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Delete ${block.label}`}
                          >
                            <Trash2 size={13} />
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
              <div className="sticky top-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {editingId === 'new' ? 'নতুন Block তৈরি' : 'Block সম্পাদনা'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingId(null)
                      resetForm()
                      setError(null)
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="Close editor"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[140px_1fr_1fr]">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Icon</label>
                      <select
                        value={form.icon}
                        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:ring-2 focus:ring-slate-300"
                      >
                        {['share', 'terminal', 'palette', 'extension', 'play', 'info', 'warning', 'lightbulb', 'quote', 'stat', 'image'].map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Block নাম <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                        placeholder="callout"
                        disabled={editingId !== 'new'}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none transition focus:ring-2 focus:ring-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">শুধু ছোট হাতের অক্ষর, সংখ্যা, - বা _</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Display লেবেল <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.label}
                        onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                        placeholder="Callout Box"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">বিবরণ</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="এই block কী করে?"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-slate-300"
                    />
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Parameters <span className="font-normal normal-case text-slate-500">— template-এ {'{{name}}'} দিয়ে ব্যবহার করুন</span>
                      </label>
                      <button
                        onClick={addParam}
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Plus size={11} /> যোগ করুন
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
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
                        <p className="py-2 text-xs italic text-slate-400">
                          কোনো parameter নেই — static HTML block তৈরি করতে পারেন
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        HTML Template <span className="text-red-500">*</span>
                      </label>

                      <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <button
                          onClick={() => setPreviewTab('edit')}
                          className={`inline-flex items-center gap-1 px-3 py-2 text-[10px] font-semibold transition ${
                            previewTab === 'edit' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Code2 size={10} /> কোড
                        </button>
                        <button
                          onClick={() => setPreviewTab('preview')}
                          className={`inline-flex items-center gap-1 px-3 py-2 text-[10px] font-semibold transition ${
                            previewTab === 'preview' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Eye size={10} /> Preview
                        </button>
                      </div>
                    </div>

                    {previewTab === 'edit' ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200">
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
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <LivePreview template={form.htmlTemplate} params={form.params} />
                      </div>
                    )}

                    <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-5 text-slate-400">
                      <Info size={10} className="mt-0.5" />
                      Parameter মানের জন্য {'{{param_name}}'} ব্যবহার করুন। Inline styles বা utility classes ব্যবহার করুন কারণ article CSS আলাদা।
                    </p>
                  </div>

                  {form.name && (
                    <div className="mt-5">
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Article-এ ব্যবহারের syntax
                      </label>
                      <SyntaxUsage name={form.name} params={form.params} />
                    </div>
                  )}

                  {error && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle size={14} /> {error}
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => {
                        setEditingId(null)
                        resetForm()
                        setError(null)
                      }}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:flex-1"
                    >
                      বাতিল
                    </button>
                    <button
                      onClick={save}
                      disabled={saving || !form.name || !form.label || !form.htmlTemplate}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    >
                      {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                      {saving ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Info size={14} /> কীভাবে ব্যবহার করবেন
          </h3>
          <div className="grid gap-4 text-xs text-slate-600 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">১. Block তৈরি করুন</div>
              <p>
                একটি নাম, লেবেল দিন। Parameters যোগ করুন এবং HTML template লিখুন। <code className="rounded bg-slate-200 px-1">{'{{param}}'}</code> দিয়ে মান বসানো হবে।
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">২. Article-এ ব্যবহার করুন</div>
              <p>Write page-এ markdown editor-এ লিখুন:</p>
              <code className="break-all rounded bg-slate-200 px-2 py-1 text-[10px]">
                [!blockname(param1="মান")]
              </code>
            </div>
            <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">৩. Preview দেখুন</div>
              <p>Article preview বা Published article-এ block render হবে।</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}