'use client'

import { useState } from 'react'
import type { NewsArticle } from '@/lib/db/articles'
import { useArticleEditor } from './useArticleEditor'
import { RichEditor } from './RichEditor'
import { FeaturedImageUploader } from './FeaturedImageUploader'
import { SeoPanel } from './SeoPanel'
import { PublishPanel } from './PublishPanel'

interface Props {
  editingArticle?: NewsArticle | null
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#FAEEDA', text: '#854F0B' },
  published: { bg: '#EAF3DE', text: '#3B6D11' },
  scheduled: { bg: '#E6F1FB', text: '#185FA5' },
  archived:  { bg: 'var(--hover-bg)', text: 'var(--text-tertiary)' },
}

export function ArticleEditor({ editingArticle = null }: Props) {
  const {
    form, set, tags, setTags,
    saving, publishing, lastSaved,
    seoAnalysis,
    wordCount, readTimeCalc,
    activeTab, setActiveTab,
    saveDraft, publishArticle, deleteArticle,
  } = useArticleEditor(editingArticle)

  const sc = statusColors[form.status] ?? statusColors.draft

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gridTemplateRows: 'auto 1fr',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: breadcrumb + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
            <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</a>
            <span>›</span>
            <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Articles</a>
            <span>›</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {editingArticle ? 'Edit article' : 'New article'}
            </span>
          </nav>

          <span
            style={{
              fontSize: 11,
              padding: '2px 9px',
              borderRadius: 20,
              background: sc.bg,
              color: sc.text,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {form.status}
          </span>

          {lastSaved && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => saveDraft()}
            disabled={saving}
            style={{
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>

          <button
            onClick={() => {
              const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              window.open(`/article/${slug}?preview=true`, '_blank')
            }}
            style={{
              fontSize: 13,
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 600,
            }}
          >
            Preview ↗
          </button>

          <button
            onClick={publishArticle}
            disabled={publishing || !form.title.trim() || !form.content.trim()}
            style={{
              fontSize: 13,
              padding: '6px 16px',
              borderRadius: 8,
              border: '1px solid var(--text-primary)',
              background: form.status === 'published' ? '#3B6D11' : 'var(--text-primary)',
              color: 'var(--bg-primary)',
              cursor: 'pointer',
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              opacity: publishing ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {publishing ? 'Publishing…' :
             form.status === 'published' ? 'Update' :
             form.status === 'scheduled' ? 'Schedule' : 'Publish'}
          </button>
        </div>
      </div>

      {/* ── Main editor ──────────────────────────────────────────────── */}
      <div style={{ padding: '28px 36px', overflowY: 'auto' }}>
        {/* Word count bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>{wordCount}</strong> words ·{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>{readTimeCalc}</strong> min read
          </span>
          {seoAnalysis && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>SEO score:</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    seoAnalysis.score >= 70 ? '#3B6D11' :
                    seoAnalysis.score >= 50 ? '#854F0B' : '#A32D2D',
                }}
              >
                {seoAnalysis.score} / 100
              </span>
            </span>
          )}
        </div>

        {/* Title */}
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Article title…"
          maxLength={120}
          style={{
            width: '100%',
            fontSize: 28,
            fontWeight: 600,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: "'Syne', sans-serif",
            lineHeight: 1.3,
            marginBottom: 8,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border)',
          }}
        />

        {/* Description */}
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Write a short description for previews and SEO…"
          rows={2}
          style={{
            width: '100%',
            fontSize: 14,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontFamily: "'DM Mono', monospace",
            resize: 'none',
            lineHeight: 1.6,
            margin: '10px 0 20px',
          }}
        />

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            marginBottom: 16,
          }}
        >
          {(['write', 'preview'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: 13,
                padding: '8px 16px',
                cursor: 'pointer',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                marginBottom: -1,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                fontFamily: "'Syne', sans-serif",
                fontWeight: 600,
                transition: 'color 0.12s',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'write' ? (
          <>
            <RichEditor
              value={form.content}
              onChange={v => set('content', v)}
              placeholder={`Start writing your article…\n\nUse the toolbar above or markdown shortcuts:\n**bold**, *italic*, ## Heading, > blockquote`}
              minHeight={360}
            />
            <FeaturedImageUploader
              value={form.image}
              onChange={v => set('image', v)}
            />
          </>
        ) : (
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 24,
              minHeight: 360,
            }}
          >
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginBottom: 10,
                color: 'var(--text-primary)',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {form.title || '(No title)'}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              {form.description || '(No description)'}
            </p>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {form.content || '(No content yet)'}
            </div>
          </div>
        )}
      </div>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <div
        style={{
          borderLeft: '1px solid var(--border)',
          background: 'var(--card-bg)',
          overflowY: 'auto',
          paddingBottom: 24,
        }}
      >
        <PublishPanel
          form={form}
          set={set}
          tags={tags}
          setTags={setTags}
          onDelete={editingArticle ? deleteArticle : undefined}
        />
        <SeoPanel
          form={form}
          set={set}
          seoAnalysis={seoAnalysis}
        />
      </div>
    </div>
  )
}
