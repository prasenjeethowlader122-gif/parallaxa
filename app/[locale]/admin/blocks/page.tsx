'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  Plus, Trash2, Edit3, Save, X, Copy, Check, ChevronDown,
  ChevronUp, Info, Puzzle, Code2, Eye, RefreshCw, AlertCircle,
  Sparkles, BookOpen, Terminal, Layout
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
  { name: 'embed', label: 'Social Embed', icon: '🔗', description: 'Facebook, Twitter, YouTube, Instagram, Reddit, Vimeo embed করুন', usage: '[!embed(url="https://...")]' },
  { name: 'run', label: 'Run Code', icon: '▶️', description: 'Custom HTML/JS code চালান', usage: '[!run(code="<b>Hello</b>")]' },
  { name: 'style', label: 'Custom CSS', icon: '🎨', description: 'Article-এ custom CSS যোগ করুন', usage: '[!style(css=".myclass { color: red }")]' },
]

const PRESET_TEMPLATES = [
  {
    icon: '💡',
    name: 'callout',
    label: 'Callout Box',
    description: 'সাধারণ তথ্য বাক্স',
    params: [
      { name: 'text', label: 'বার্তা', placeholder: 'এখানে লিখুন…', defaultValue: '' },
      { name: 'type', label: 'ধরন (info/warning/success)', placeholder: 'info', defaultValue: 'info' },
    ],
    htmlTemplate: `<div style="border-left: 4px solid #3b82f6; background: #eff6ff; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 15px; line-height: 1.6; color: #1e3a5f;">
  <strong>💡</strong> {{text}}
</div>`,
  },
  {
    icon: '⚠️',
    name: 'warning',
    label: 'Warning Box',
    description: 'সতর্কতা বাক্স',
    params: [
      { name: 'text', label: 'সতর্কতা', placeholder: 'সতর্কতার বার্তা…', defaultValue: '' },
    ],
    htmlTemplate: `<div style="border-left: 4px solid #f59e0b; background: #fffbeb; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; font-size: 15px; line-height: 1.6; color: #78350f;">
  <strong>⚠️ সতর্কতা:</strong> {{text}}
</div>`,
  },
  {
    icon: '📌',
    name: 'fact',
    label: 'Fact Box',
    description: 'তথ্য বাক্স — তথ্য ও উৎস সহ',
    params: [
      { name: 'text', label: 'তথ্য', placeholder: 'গুরুত্বপূর্ণ তথ্য…', defaultValue: '' },
      { name: 'source', label: 'উৎস', placeholder: 'উৎস প্রতিষ্ঠান', defaultValue: '' },
    ],
    htmlTemplate: `<div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 20px; margin: 16px 0; background: #f9fafb;">
  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px;">📌 তথ্য</div>
  <p style="margin: 0 0 8px; font-size: 16px; line-height: 1.65; color: #111827;">{{text}}</p>
  <div style="font-size: 12px; color: #9ca3af;">— উৎস: {{source}}</div>
</div>`,
  },
  {
    icon: '🗣️',
    name: 'pullquote',
    label: 'Pull Quote',
    description: 'বড় উদ্ধৃতি হাইলাইট',
    params: [
      { name: 'text', label: 'উদ্ধৃতি', placeholder: 'উদ্ধৃতি লিখুন…', defaultValue: '' },
      { name: 'author', label: 'ব্যক্তি/উৎস', placeholder: 'নাম বা পদ', defaultValue: '' },
    ],
    htmlTemplate: `<blockquote style="border-left: 4px solid #ef4444; padding: 20px 24px; margin: 24px 0; background: #fef2f2; border-radius: 0 12px 12px 0;">
  <p style="font-size: 20px; font-style: italic; color: #991b1b; margin: 0 0 10px; line-height: 1.5; font-family: Georgia, serif;">"{{text}}"</p>
  <cite style="font-size: 13px; color: #b91c1c; font-style: normal; font-weight: 600;">— {{author}}</cite>
</blockquote>`,
  },
  {
    icon: '📊',
    name: 'stat',
    label: 'Stat Highlight',
    description: 'বড় সংখ্যা/তথ্য হাইলাইট',
    params: [
      { name: 'number', label: 'সংখ্যা/তথ্য', placeholder: '৫,০০০', defaultValue: '' },
      { name: 'label', label: 'বিবরণ', placeholder: 'নিহত মানুষ', defaultValue: '' },
      { name: 'source', label: 'উৎস', placeholder: 'জাতিসংঘ', defaultValue: '' },
    ],
    htmlTemplate: `<div style="text-align: center; padding: 28px 20px; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 16px; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);">
  <div style="font-size: 48px; font-weight: 800; color: #111827; line-height: 1; margin-bottom: 8px;">{{number}}</div>
  <div style="font-size: 14px; color: #6b7280; margin-bottom: 4px; font-weight: 500;">{{label}}</div>
  <div style="font-size: 11px; color: #9ca3af;">সূত্র: {{source}}</div>
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
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">নাম (code)</label>
          <input
            value={param.name}
            onChange={e => onChange(index, 'name', e.target.value.replace(/[^a-z0-9_]/g, ''))}
            placeholder="param_name"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">লেবেল</label>
          <input
            value={param.label}
            onChange={e => onChange(index, 'label', e.target.value)}
            placeholder="Parameter Label"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Placeholder</label>
          <input
            value={param.placeholder}
            onChange={e => onChange(index, 'placeholder', e.target.value)}
            placeholder="উদাহরণ মান…"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Default মান</label>
          <input
            value={param.defaultValue}
            onChange={e => onChange(index, 'defaultValue', e.target.value)}
            placeholder="ডিফল্ট মান…"
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
        </div>
      </div>
      <button
        onClick={() => onRemove(index)}
        className="mt-5 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
      >
        <X size={14} />
      </button>
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
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-xl">
        Template লিখুন preview দেখতে
      </div>
    )
  }

  return (
    <div
      className="min-h-[60px] rounded-xl border border-gray-100 overflow-hidden"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}

function SyntaxUsage({ name, params }: { name: string; params: BlockParam[] }) {
  const [copied, setCopied] = useState(false)
  const usage = `[!${name || 'blockname'}(${params.map(p => `${p.name}="${p.defaultValue || p.placeholder || '...'}""`).join(' ')})]`

  const copy = () => {
    navigator.clipboard.writeText(usage)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-gray-900 rounded-xl px-4 py-3 flex items-center gap-3">
      <code className="text-green-400 text-xs font-mono flex-1 break-all">{usage}</code>
      <button onClick={copy} className="shrink-0 text-gray-500 hover:text-white transition-colors">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export default function BlockManagerPage() {
  const [blocks, setBlocks] = useState<CustomBlock[]>([])
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
    icon: '🧩',
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

  useEffect(() => { fetchBlocks() }, [fetchBlocks])

  const resetForm = () => setForm({ name: '', label: '', description: '', icon: '🧩', params: [], htmlTemplate: '' })

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
  }

  const loadPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setForm({
      name: preset.name,
      label: preset.label,
      description: preset.description,
      icon: preset.icon,
      params: preset.params.map(p => ({ ...p })),
      htmlTemplate: preset.htmlTemplate,
    })
    setEditingId('new')
    setShowPresets(false)
    setPreviewTab('edit')
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
    <div className="min-h-screen bg-[#f5f3f3] flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">

        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Newsreader'] text-3xl font-bold text-[#1a1b1c]">Custom Block Manager</h1>
            <p className="text-sm text-[#9e9fa0] mt-1">নতুন block তৈরি করুন, সম্পাদনা করুন, মুছুন</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPresets(p => !p)}
              className="flex items-center gap-2 px-4 py-2 border border-[#dcdad9] bg-white text-sm font-medium text-[#5e5f61] rounded-2xl hover:bg-[#efedee] transition-colors"
            >
              <Sparkles size={14} />
              Preset
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1b1c] text-white text-sm font-semibold rounded-2xl hover:bg-[#3d4042] transition-colors"
            >
              <Plus size={14} />
              নতুন Block
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Preset Templates */}
        {showPresets && (
          <div className="mb-6 bg-white rounded-2xl border border-[#e4e2e1] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm text-[#1a1b1c]">Preset Templates</h2>
              <button onClick={() => setShowPresets(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {PRESET_TEMPLATES.map(p => (
                <button
                  key={p.name}
                  onClick={() => loadPreset(p)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#e4e2e1] hover:border-[#585f64] hover:bg-[#f5f3f3] transition-all text-center"
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-xs font-semibold text-[#1a1b1c]">{p.label}</span>
                  <span className="text-[10px] text-[#9e9fa0] leading-tight">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${isEditing ? 'lg:grid-cols-5' : 'grid-cols-1'}`}>

          {/* Left — Block List */}
          <div className={isEditing ? 'lg:col-span-2' : 'col-span-1'}>

            {/* Built-in Blocks */}
            <div className="bg-white rounded-2xl border border-[#e4e2e1] mb-4 overflow-hidden">
              <button
                onClick={() => setExpandedBuiltin(e => !e)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f5f3f3] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-[#efedee] rounded-lg flex items-center justify-center">
                    <BookOpen size={13} className="text-[#585f64]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#1a1b1c]">Built-in Blocks</p>
                    <p className="text-[10px] text-[#9e9fa0]">{BUILTIN_BLOCKS.length}টি বিল্ট-ইন ব্লক</p>
                  </div>
                </div>
                {expandedBuiltin ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </button>
              {expandedBuiltin && (
                <div className="border-t border-[#e4e2e1] divide-y divide-[#f0eeed]">
                  {BUILTIN_BLOCKS.map(b => (
                    <div key={b.name} className="px-5 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{b.icon}</span>
                          <span className="text-sm font-semibold text-[#1a1b1c]">{b.label}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-[#efedee] text-[#9e9fa0] rounded-full">built-in</span>
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(b.usage); setCopiedSyntax(b.name); setTimeout(() => setCopiedSyntax(null), 1500) }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                          title="Copy usage"
                        >
                          {copiedSyntax === b.name ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#9e9fa0]">{b.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Blocks */}
            <div className="bg-white rounded-2xl border border-[#e4e2e1] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#e4e2e1] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Puzzle size={14} className="text-[#585f64]" />
                  <span className="text-sm font-semibold text-[#1a1b1c]">আমার Blocks</span>
                </div>
                {loading && <RefreshCw size={13} className="animate-spin text-gray-400" />}
              </div>

              {!loading && blocks.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="text-3xl mb-3">🧩</div>
                  <p className="text-sm text-[#9e9fa0]">এখনো কোনো custom block নেই</p>
                  <button onClick={openNew} className="mt-4 text-xs text-[#585f64] underline underline-offset-2">প্রথম block তৈরি করুন</button>
                </div>
              ) : (
                <div className="divide-y divide-[#f0eeed]">
                  {blocks.map(block => (
                    <div
                      key={block.id}
                      className={`px-5 py-3.5 hover:bg-[#faf9f9] transition-colors ${editingId === block.id ? 'bg-[#f5f3f3] ring-1 ring-inset ring-[#dcdad9]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5 shrink-0">{block.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[#1a1b1c]">{block.label}</span>
                            <code className="text-[10px] px-1.5 py-0.5 bg-[#efedee] text-[#585f64] rounded font-mono">{block.name}</code>
                          </div>
                          {block.description && <p className="text-[11px] text-[#9e9fa0] mt-0.5 line-clamp-1">{block.description}</p>}
                          <p className="text-[10px] text-[#c0bebe] mt-1">{block.params.length}টি parameter</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copyUsage(block.name, block.params)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                            title="Usage copy করুন"
                          >
                            {copiedSyntax === block.name ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => openEdit(block)}
                            className="p-1.5 text-gray-400 hover:text-[#585f64] rounded-lg transition-colors"
                            title="সম্পাদনা"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => deleteBlock(block.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                            title="মুছুন"
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

          {/* Right — Create/Edit Form */}
          {isEditing && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-[#e4e2e1] overflow-hidden sticky top-4">
                {/* Form Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e2e1]">
                  <h2 className="font-semibold text-sm text-[#1a1b1c]">
                    {editingId === 'new' ? 'নতুন Block তৈরি' : 'Block সম্পাদনা'}
                  </h2>
                  <button onClick={() => { setEditingId(null); resetForm(); setError(null) }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                    <X size={14} />
                  </button>
                </div>

                <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-200px)]">

                  {/* Basic Info */}
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-start">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Icon</label>
                      <input
                        value={form.icon}
                        onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                        maxLength={4}
                        className="w-14 h-10 text-center text-xl border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                        Block নাম <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                        placeholder="callout"
                        disabled={editingId !== 'new'}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">শুধু ছোট হাতের অক্ষর, সংখ্যা, - বা _</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">
                        Display লেবেল <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.label}
                        onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                        placeholder="Callout Box"
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">বিবরণ</label>
                    <input
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="এই block কী করে?"
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    />
                  </div>

                  {/* Parameters */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        Parameters <span className="text-[#9e9fa0] normal-case font-normal">— template-এ {'{{name}}'} দিয়ে ব্যবহার করুন</span>
                      </label>
                      <button
                        onClick={addParam}
                        className="flex items-center gap-1 text-[10px] font-semibold text-[#585f64] hover:text-[#1a1b1c] transition-colors"
                      >
                        <Plus size={11} /> যোগ করুন
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {form.params.map((p, i) => (
                        <ParamRow key={i} param={p} index={i} onChange={updateParam} onRemove={removeParam} />
                      ))}
                      {form.params.length === 0 && (
                        <p className="text-xs text-gray-400 italic py-2">কোনো parameter নেই — static HTML block তৈরি করতে পারেন</p>
                      )}
                    </div>
                  </div>

                  {/* HTML Template */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        HTML Template <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => setPreviewTab('edit')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors ${previewTab === 'edit' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          <Code2 size={10} /> কোড
                        </button>
                        <button
                          onClick={() => setPreviewTab('preview')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold transition-colors ${previewTab === 'preview' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                          <Eye size={10} /> Preview
                        </button>
                      </div>
                    </div>
                    {previewTab === 'edit' ? (
                      <textarea
                        value={form.htmlTemplate}
                        onChange={e => setForm(f => ({ ...f, htmlTemplate: e.target.value }))}
                        placeholder={`<div style="border-left: 4px solid #3b82f6; padding: 14px 18px; background: #eff6ff; border-radius: 0 8px 8px 0;">\n  <strong>💡</strong> {{text}}\n</div>`}
                        rows={10}
                        className="w-full text-xs font-mono border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none bg-gray-50"
                      />
                    ) : (
                      <div className="border border-gray-200 rounded-xl p-4 bg-white min-h-[120px]">
                        <LivePreview template={form.htmlTemplate} params={form.params} />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
                      <Info size={10} />
                      Parameter মানের জন্য {'{{param_name}}'} ব্যবহার করুন। Inline styles ব্যবহার করুন কারণ article CSS আলাদা।
                    </p>
                  </div>

                  {/* Syntax Preview */}
                  {form.name && (
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Article-এ ব্যবহারের syntax</label>
                      <SyntaxUsage name={form.name} params={form.params} />
                    </div>
                  )}

                  {/* Save */}
                  {error && (
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle size={14} /> {error}
                    </p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setEditingId(null); resetForm(); setError(null) }}
                      className="flex-1 py-2.5 border border-[#dcdad9] rounded-2xl text-sm font-medium text-[#5e5f61] hover:bg-[#f5f3f3] transition-colors"
                    >
                      বাতিল
                    </button>
                    <button
                      onClick={save}
                      disabled={saving || !form.name || !form.label || !form.htmlTemplate}
                      className="flex-1 py-2.5 bg-[#1a1b1c] text-white rounded-2xl text-sm font-semibold hover:bg-[#3d4042] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* Help */}
        <div className="mt-8 bg-white rounded-2xl border border-[#e4e2e1] p-5">
          <h3 className="text-sm font-semibold text-[#1a1b1c] mb-3 flex items-center gap-2">
            <Info size={14} /> কীভাবে ব্যবহার করবেন
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs text-[#5e5f61]">
            <div className="flex flex-col gap-1.5">
              <div className="font-semibold text-[#1a1b1c]">১. Block তৈরি করুন</div>
              <p>একটি নাম, লেবেল দিন। Parameters যোগ করুন এবং HTML template লিখুন। <code className="bg-[#efedee] px-1 rounded">{'{{param}}'}</code> দিয়ে মান বসানো হবে।</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="font-semibold text-[#1a1b1c]">২. Article-এ ব্যবহার করুন</div>
              <p>Write page-এ markdown editor-এ লিখুন:</p>
              <code className="bg-[#efedee] px-2 py-1 rounded text-[10px] break-all">[!blockname(param1="মান")]</code>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="font-semibold text-[#1a1b1c]">৩. Preview দেখুন</div>
              <p>Article preview বা Published article-এ block টি render হবে। Inline styles ব্যবহার করুন সেরা ফলাফলের জন্য।</p>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  )
}
