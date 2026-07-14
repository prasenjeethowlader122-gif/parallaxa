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
                <h2 className="text-sm font-semibold">Mobile Header Menu Configuration</h2>
              </div>
              <button
                onClick={handleAddLink}
                className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-none"
              >
                Add Link
              </button>
            </div>
            <div className="p-6 space-y-4">
              {menuLinks.map((link, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveLink(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 -rotate-90" />
                    </button>
                    <button
                      onClick={() => handleMoveLink(idx, 'down')}
                      disabled={idx === menuLinks.length - 1}
                      className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1 w-full">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Label</label>
                      <input
                        value={link.label || ''}
                        onChange={e => handleUpdateLink(idx, 'label', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                        placeholder="e.g. World"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Href / Path</label>
                      <input
                        value={link.href || ''}
                        onChange={e => handleUpdateLink(idx, 'href', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                        placeholder="e.g. /category/World"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Icon</label>
                      <select
                        value={link.iconName || 'Home'}
                        onChange={e => handleUpdateLink(idx, 'iconName', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
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
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Badge (Optional)</label>
                      <input
                        value={link.badge || ''}
                        onChange={e => handleUpdateLink(idx, 'badge', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 transition-all font-semibold text-red-600"
                        placeholder="e.g. New"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveLink(idx)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all shrink-0 self-stretch md:self-center flex items-center justify-center text-xs font-semibold"
                    title="Remove Link"
                  >
                    Delete
                  </button>
                </div>
              ))}

              {menuLinks.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No links added yet. Click "Add Link" to get started.
                </div>
              )}
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
