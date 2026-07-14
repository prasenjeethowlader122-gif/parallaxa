'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  Save, RefreshCw, AlertCircle, CheckCircle2,
  Settings, Bot, Share2, Shield, Zap,
  ChevronRight, ExternalLink
} from 'lucide-react'
import type { SystemSettings } from '@/lib/db/settings'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [menuLinks, setMenuLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
            console.error('Failed to parse mobile menu links:', e)
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
    setMenuLinks([...menuLinks, { href: '/', label: 'New Link', iconName: 'Home', badge: '' }])
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
      setSuccess('Settings saved successfully')
    } catch (err) {
      setError('Error saving settings')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure AI pipeline, Facebook integration, and system parameters.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700 shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid gap-8">
          {/* AI Settings Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Bot className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-semibold">AI Pipeline Configuration</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">AI Model</label>
                  <input
                    value={settings?.ai_model || ''}
                    onChange={e => setSettings(s => s ? { ...s, ai_model: e.target.value } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">API Key</label>
                  <input
                    type="password"
                    value={settings?.ai_api_key || ''}
                    onChange={e => setSettings(s => s ? { ...s, ai_api_key: e.target.value } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Max Tokens</label>
                  <input
                    type="number"
                    value={settings?.ai_max_tokens || 0}
                    onChange={e => setSettings(s => s ? { ...s, ai_max_tokens: Number(e.target.value) } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={settings?.ai_temperature || 0}
                    onChange={e => setSettings(s => s ? { ...s, ai_temperature: Number(e.target.value) } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">System Prompt</label>
                <textarea
                  rows={6}
                  value={settings?.ai_system_prompt || ''}
                  onChange={e => setSettings(s => s ? { ...s, ai_system_prompt: e.target.value } : null)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                />
              </div>
            </div>
          </section>

          {/* Facebook Settings Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Share2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-semibold">Facebook Post Configuration</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Page ID</label>
                  <input
                    value={settings?.fb_page_id || ''}
                    onChange={e => setSettings(s => s ? { ...s, fb_page_id: e.target.value } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Access Token</label>
                  <input
                    type="password"
                    value={settings?.fb_access_token || ''}
                    onChange={e => setSettings(s => s ? { ...s, fb_access_token: e.target.value } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Thumbnail Template</label>
                  <select
                    value={settings?.fb_thumbnail_template || 'default'}
                    onChange={e => setSettings(s => s ? { ...s, fb_thumbnail_template: e.target.value } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="default">Default News</option>
                    <option value="breaking">Breaking News Red</option>
                    <option value="minimal">Minimal Dark</option>
                    <option value="elegant">Elegant Serif</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Mobile Menu Settings Section */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h2 className="text-sm font-semibold">Header & Mobile Navigation Menu</h2>
              </div>
            </div>
            <div className="p-6 text-center space-y-4">
              <p className="text-sm text-slate-500 max-w-lg mx-auto">
                Header menu links and custom icons (such as image or SVG links) are managed inside their own dedicated system now.
              </p>
              <div>
                <a
                  href={`/${locale}/admin/menu`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all"
                >
                  Manage Header Menu Links
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </section>

          {/* Footer Save Button */}
          <div className="flex justify-end gap-4 pb-12">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
            >
              Reset Changes
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-md shadow-slate-900/10"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
