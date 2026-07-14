'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  CaretUp,
  CaretDown,
  Trash,
  Plus,
  ArrowLeft,
  FloppyDisk,
  ArrowCounterClockwise,
  List,
  Eye,
  CheckCircle,
  Warning
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useParams } from 'next/navigation'

function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return svg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"])(.*?)\1/gi, '')
    .replace(/javascript\s*:/gi, '');
}

export default function AdminMenuPage() {
  const [settings, setSettings] = useState<any | null>(null)
  const [menuLinks, setMenuLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const params = useParams()
  const locale = params?.locale || 'bn'

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin/settings')
        if (!res.ok) throw new Error('Failed to fetch settings')
        const data = await res.json()
        setSettings(data)
        if (data.mobile_menu_links) {
          try {
            setMenuLinks(JSON.parse(data.mobile_menu_links))
          } catch (e) {
            console.error('Failed to parse menu links:', e)
          }
        }
      } catch (err) {
        setError('Error loading settings')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleAddLink = () => {
    setMenuLinks([...menuLinks, { href: '/', label: 'New Link', iconName: 'Home', iconUrl: '', badge: '' }])
  }

  const handleRemoveLink = (index: number) => {
    setMenuLinks(menuLinks.filter((_, i) => i !== index))
  }

  const handleUpdateLink = (index: number, field: string, value: string) => {
    const updated = [...menuLinks]
    updated[index] = { ...updated[index], [field]: value }
    setMenuLinks(updated)
  }

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    const updated = [...menuLinks]
    if (direction === 'up' && index > 0) {
      [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]]
    } else if (direction === 'down' && index < updated.length - 1) {
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    }
    setMenuLinks(updated)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        ...settings,
        mobile_menu_links: JSON.stringify(menuLinks)
      }
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      setSettings(payload)
      setSuccess('Menu links saved successfully')
      toast.success('Header menu successfully updated')
    } catch (err) {
      setError('Error saving settings')
      console.error(err)
      toast.error('Failed to save menu configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
            <p className="text-sm text-slate-500">Loading menu configuration...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link href={`/${locale}/dashboard`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2 transition-colors">
              <ArrowLeft size={14} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Header Menu Management</h1>
            <p className="mt-1 text-sm text-slate-500">Add, update, delete, reorder, or customize header menu links and their icons.</p>
          </div>
          <button
            onClick={handleAddLink}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all self-start sm:self-auto"
          >
            <Plus size={18} weight="bold" />
            Add Menu Link
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <Warning size={20} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle size={20} className="shrink-0 text-green-600" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            {menuLinks.map((link, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4">
                {/* Drag / Position controls */}
                <div className="flex flex-row md:flex-col gap-1 items-center justify-center md:justify-start shrink-0 border-r border-slate-200 md:pr-4">
                  <button
                    onClick={() => handleMoveLink(idx, 'up')}
                    disabled={idx === 0}
                    className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                    title="Move Up"
                  >
                    <CaretUp size={18} weight="bold" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <button
                    onClick={() => handleMoveLink(idx, 'down')}
                    disabled={idx === menuLinks.length - 1}
                    className="p-2 hover:bg-slate-200 rounded-lg disabled:opacity-30"
                    title="Move Down"
                  >
                    <CaretDown size={18} weight="bold" />
                  </button>
                </div>

                {/* Edit fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 flex-1">
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Label</label>
                    <input
                      value={link.label || ''}
                      onChange={e => handleUpdateLink(idx, 'label', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                      placeholder="e.g. World"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Href / Path</label>
                    <input
                      value={link.href || ''}
                      onChange={e => handleUpdateLink(idx, 'href', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-mono"
                      placeholder="e.g. /category/World"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Default Icon</label>
                    <select
                      value={link.iconName || 'Home'}
                      onChange={e => handleUpdateLink(idx, 'iconName', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    >
                      <option value="Home">Home</option>
                      <option value="Globe">Globe</option>
                      <option value="Cpu">Cpu</option>
                      <option value="Briefcase">Briefcase</option>
                      <option value="Trophy">Trophy</option>
                      <option value="FlaskConical">FlaskConical</option>
                      <option value="Activity">Activity</option>
                      <option value="MessageSquare">MessageSquare</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Badge (Optional)</label>
                    <input
                      value={link.badge || ''}
                      onChange={e => handleUpdateLink(idx, 'badge', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-semibold text-red-600"
                      placeholder="e.g. New"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Preview</label>
                    <div className="h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl px-3">
                      {link.iconUrl ? (
                        link.iconUrl.trim().startsWith('<svg') ? (
                          <div
                            className="w-5 h-5 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 [&>svg]:object-contain"
                            dangerouslySetInnerHTML={{ __html: sanitizeSvg(link.iconUrl) }}
                          />
                        ) : (
                          <img
                            src={link.iconUrl}
                            alt=""
                            className="w-5 h-5 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/20x20/efeff1/6b7280?text=ERR'
                            }}
                          />
                        )
                      ) : (
                        <span className="text-slate-400 text-xs italic">Default</span>
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-12">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Custom Icon (Image URL or Inline SVG)</label>
                    <textarea
                      rows={1}
                      value={link.iconUrl || ''}
                      onChange={e => handleUpdateLink(idx, 'iconUrl', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-slate-900/10 transition-all font-mono"
                      placeholder="e.g. https://domain.com/icon.png OR <svg xmlns='http://www.w3.org/2000/svg' ...>...</svg>"
                    />
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRemoveLink(idx)}
                  className="p-3 hover:bg-red-50 text-red-600 rounded-xl transition-all shrink-0 self-stretch md:self-center flex items-center justify-center text-xs font-semibold gap-2 border border-slate-200 md:border-0 hover:border-red-100"
                  title="Remove Link"
                >
                  <Trash size={18} />
                  <span className="md:hidden">Delete Link</span>
                </button>
              </div>
            ))}

            {menuLinks.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm italic">
                No links configured. Click "Add Menu Link" to create one.
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-4 pb-12">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <ArrowCounterClockwise size={18} />
              Reset Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <FloppyDisk size={18} />
              )}
              {saving ? 'Saving...' : 'Save Menu Config'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
