'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { NewsArticle, CreateArticleInput } from '@/lib/db/articles'
import { analyzeSeo, type SeoAnalysis } from '@/lib/seo'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EditorForm {
  // Core
  title: string
  description: string
  content: string
  category: string
  image: string
  readTime: number
  featured: boolean
  breaking: boolean
  trending: boolean
  date: string
  // Publish
  status: 'draft' | 'published' | 'scheduled' | 'archived'
  visibility: 'public' | 'unlisted' | 'members'
  scheduledDate: string
  scheduledTime: string
  readTimeOverride: boolean
  // SEO
  seoTitle: string
  metaDescription: string
  focusKeyword: string
  canonicalUrl: string
  ogImage: string
  twitterCard: 'summary_large_image' | 'summary' | 'app'
  // Advanced
  noIndex: boolean
  allowComments: boolean
  showInRss: boolean
  ampEnabled: boolean
  redirectUrl: string
  cssClass: string
}

const defaultForm = (): EditorForm => ({
  title: '', description: '', content: '', category: 'Technology',
  image: '', readTime: 3, featured: false, breaking: false, trending: false,
  date: new Date().toISOString().split('T')[0],
  status: 'draft', visibility: 'public',
  scheduledDate: '', scheduledTime: '09:00', readTimeOverride: false,
  seoTitle: '', metaDescription: '', focusKeyword: '',
  canonicalUrl: '', ogImage: '', twitterCard: 'summary_large_image',
  noIndex: false, allowComments: true, showInRss: true,
  ampEnabled: false, redirectUrl: '', cssClass: '',
})

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useArticleEditor(editingArticle: NewsArticle | null) {
  const router = useRouter()
  const [form, setForm] = useState<EditorForm>(defaultForm())
  const [tags, setTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [seoAnalysis, setSeoAnalysis] = useState<SeoAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write')
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate form when editing an existing article
  useEffect(() => {
    if (!editingArticle) return
    setForm({
      title:       editingArticle.title,
      description: editingArticle.description,
      content:     editingArticle.content,
      category:    editingArticle.category,
      image:       editingArticle.image,
      readTime:    editingArticle.readTime,
      featured:    editingArticle.featured  ?? false,
      breaking:    editingArticle.breaking  ?? false,
      trending:    editingArticle.trending  ?? false,
      date:        new Date(editingArticle.date).toISOString().split('T')[0],
      status:      (editingArticle.status    as EditorForm['status'])    ?? 'draft',
      visibility:  (editingArticle.visibility as EditorForm['visibility']) ?? 'public',
      scheduledDate: editingArticle.scheduledAt
        ? new Date(editingArticle.scheduledAt).toISOString().split('T')[0]
        : '',
      scheduledTime: editingArticle.scheduledAt
        ? new Date(editingArticle.scheduledAt).toTimeString().slice(0, 5)
        : '09:00',
      readTimeOverride: false,
      seoTitle:        editingArticle.seoTitle        ?? '',
      metaDescription: editingArticle.metaDescription ?? '',
      focusKeyword:    editingArticle.focusKeyword    ?? '',
      canonicalUrl:    editingArticle.canonicalUrl    ?? '',
      ogImage:         editingArticle.ogImage         ?? '',
      twitterCard:     (editingArticle.twitterCard as EditorForm['twitterCard']) ?? 'summary_large_image',
      noIndex:         editingArticle.noIndex       ?? false,
      allowComments:   editingArticle.allowComments ?? true,
      showInRss:       editingArticle.showInRss     ?? true,
      ampEnabled:      editingArticle.ampEnabled    ?? false,
      redirectUrl:     editingArticle.redirectUrl   ?? '',
      cssClass:        editingArticle.cssClass      ?? '',
    })
  }, [editingArticle])

  // Recompute SEO whenever relevant fields change
  useEffect(() => {
    const analysis = analyzeSeo({
      title:           form.title,
      description:     form.description,
      content:         form.content,
      seoTitle:        form.seoTitle   || undefined,
      metaDescription: form.metaDescription || undefined,
      focusKeyword:    form.focusKeyword || undefined,
      slug:            slugify(form.title),
    })
    setSeoAnalysis(analysis)
  }, [form.title, form.description, form.content, form.seoTitle, form.metaDescription, form.focusKeyword])

  // Auto-save draft every 30s
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if (!form.title.trim()) return
    autoSaveTimer.current = setTimeout(() => {
      saveDraft(true)
    }, 30_000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────

  const set = useCallback(<K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length
  const readTimeCalc = Math.max(1, Math.round(wordCount / 200))

  function buildPayload(overrideStatus?: EditorForm['status']) {
    const scheduledAt =
      form.scheduledDate && form.scheduledTime
        ? new Date(`${form.scheduledDate}T${form.scheduledTime}`).toISOString()
        : null

    return {
      title:       form.title,
      description: form.description,
      content:     form.content,
      category:    form.category,
      image:       form.image,
      readTime:    form.readTimeOverride ? form.readTime : readTimeCalc,
      featured:    form.featured,
      breaking:    form.breaking,
      trending:    form.trending,
      date:        form.date,
      status:      overrideStatus ?? form.status,
      visibility:  form.visibility,
      scheduledAt,
      // SEO
      seoTitle:        form.seoTitle        || null,
      metaDescription: form.metaDescription || null,
      focusKeyword:    form.focusKeyword    || null,
      canonicalUrl:    form.canonicalUrl    || null,
      ogImage:         form.ogImage         || null,
      twitterCard:     form.twitterCard,
      // Advanced
      noIndex:       form.noIndex,
      allowComments: form.allowComments,
      showInRss:     form.showInRss,
      ampEnabled:    form.ampEnabled,
      redirectUrl:   form.redirectUrl   || null,
      cssClass:      form.cssClass      || null,
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async function saveDraft(silent = false) {
    if (!form.title.trim()) return
    if (!silent) setSaving(true)
    try {
      const payload = buildPayload('draft')
      const url    = editingArticle ? `/api/articles/${editingArticle.id}` : '/api/articles'
      const method = editingArticle ? 'PATCH' : 'POST'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setLastSaved(new Date())
    } catch (e) {
      console.error('Save failed', e)
    } finally {
      if (!silent) setSaving(false)
    }
  }

  async function publishArticle() {
    if (!form.title.trim() || !form.content.trim()) return
    setPublishing(true)
    try {
      const payload = buildPayload('published')
      const url    = editingArticle ? `/api/articles/${editingArticle.id}` : '/api/articles'
      const method = editingArticle ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const article = await res.json()
        set('status', 'published')
        setLastSaved(new Date())
        router.push(`/article/${article.slug}`)
      }
    } catch (e) {
      console.error('Publish failed', e)
    } finally {
      setPublishing(false)
    }
  }

  async function deleteArticle() {
    if (!editingArticle) return
    if (!confirm('Delete this article? This cannot be undone.')) return
    await fetch(`/api/articles/${editingArticle.id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  return {
    form, set, tags, setTags,
    saving, publishing, lastSaved,
    seoAnalysis,
    wordCount, readTimeCalc,
    activeTab, setActiveTab,
    saveDraft, publishArticle, deleteArticle,
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}
