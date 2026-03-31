'use client'

import { useState } from 'react'
import type { NewsArticle } from '@/lib/db/articles'
import { useArticleEditor } from './useArticleEditor'
import { RichEditor } from './RichEditor'
import { FeaturedImageUploader } from './FeaturedImageUploader'
import { SeoPanel } from './SeoPanel'
import { PublishPanel } from './PublishPanel'
import { Header } from '@/components/header'

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

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const sc = statusColors[form.status] ?? statusColors.draft

  return (
    <>
      {/* ── Site Header ────────────────────────────────────────────── */}
      <Header />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100vh - 64px)', /* subtract header height */
          background: 'var(--bg-primary)',
          position: 'relative',
        }}
      >
        {/* ── Editor Top bar ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'white',
            position: 'sticky',
            top: 64, /* stick below site header */
            zIndex: 40,
            flexWrap: 'wrap',
            rowGap: 8,
          }}
        >
          {/* Left: breadcrumb + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            {/* Breadcrumb — hidden on very small screens */}
            <nav
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: 'var(--text-tertiary)',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
              className="editor-breadcrumb"
            >
              <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</a>
              <span>›</span>
              <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Articles</a>
              <span>›</span>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                
                textTransform: 'capitalize',
                flexShrink: 0,
              }}
            >
              {form.status}
            </span>

            {lastSaved && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Settings toggle — only on mobile */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: sidebarOpen ? 'var(--text-primary)' : 'var(--card-bg)',
                color: sidebarOpen ? 'var(--bg-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
                
                fontWeight: 600,
              }}
              className="editor-sidebar-toggle"
            >
              ⚙ Settings
            </button>

            <button
              onClick={() => saveDraft()}
              disabled={saving}
              style={{
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                
                fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>

            <button
              onClick={() => {
                const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                window.open(`/article/${slug}?preview=true`, '_blank')
              }}
              style={{
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                
                fontWeight: 600,
              }}
              className="editor-preview-btn"
            >
              Preview ↗
            </button>

            <button className='rounded-full px-3'
              onClick={publishArticle}
              disabled={publishing || !form.title.trim() || !form.content.trim()}
              style={{
                fontSize: 13,
                padding: '6px 14px',
                
                border: '1px solid var(--text-primary)',
                background: form.status === 'published' ? '#3B6D11' : 'black',
                color: 'white',
                cursor: 'pointer',
                
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

        {/* ── Body: editor + sidebar ──────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* ── Main editor ─────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              padding: '24px 20px',
              overflowY: 'auto',
              minWidth: 0,
            }}
            className="editor-main-area"
          >
            {/* Word count bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--text-tertiary)',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              <span>
                <strong style={{ color: 'var(--text-secondary)' }}>{wordCount}</strong> words ·{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{readTimeCalc}</strong> min read
              </span>
              {seoAnalysis && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span>SEO:</span>
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
                fontSize: 'clamp(20px, 4vw, 28px)',
                fontWeight: 600,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                
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
                  padding: '20px 16px',
                  minHeight: 360,
                }}
              >
                <h1
                  style={{
                    fontSize: 'clamp(18px, 4vw, 26px)',
                    fontWeight: 700,
                    marginBottom: 10,
                    color: 'var(--text-primary)',
                    
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

          {/* ── Sidebar ─────────────────────────────────────────── */}
          {/*
            Desktop: always visible as a right column (280px)
            Mobile: slides in as an overlay when sidebarOpen=true
          */}
          <div
            className={`editor-sidebar ${sidebarOpen ? 'editor-sidebar--open' : ''}`}
            style={{
              background: 'var(--card-bg)',
              overflowY: 'auto',
              paddingBottom: 24,
            }}
          >
            {/* Mobile close button */}
            <div
              className="editor-sidebar-close"
              style={{
                display: 'none',
                justifyContent: 'flex-end',
                padding: '12px 16px 0',
              }}
            >
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  
                }}
              >
                ✕ Close
              </button>
            </div>

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

          {/* Mobile sidebar backdrop */}
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              className="editor-sidebar-backdrop"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 48,
                display: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* ── Responsive styles ──────────────────────────────────────── */}
      <style>{`
        /* Desktop: sidebar is a static right column */
        @media (min-width: 768px) {
          .editor-sidebar-toggle {
            display: none !important;
          }
          .editor-sidebar {
            width: 280px;
            flex-shrink: 0;
            border-left: 1px solid var(--border);
            position: static !important;
            transform: none !important;
          }
          .editor-sidebar-backdrop {
            display: none !important;
          }
          .editor-sidebar-close {
            display: none !important;
          }
        }

        /* Mobile: sidebar becomes a fixed right drawer */
        @media (max-width: 767px) {
          .editor-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: min(320px, 90vw);
            z-index: 49;
            transform: translateX(100%);
            transition: transform 0.25s ease;
            border-left: 1px solid var(--border);
          }
          .editor-sidebar--open {
            transform: translateX(0);
          }
          .editor-sidebar-backdrop {
            display: block !important;
          }
          .editor-sidebar-close {
            display: flex !important;
          }
          .editor-main-area {
            padding: 16px 14px !important;
          }
          /* Breadcrumb too long on mobile — abbreviate */
          .editor-breadcrumb {
            display: none !important;
          }
          /* Hide Preview button on very small phones */
          @media (max-width: 400px) {
            .editor-preview-btn {
              display: none !important;
            }
          }
        }

        /* Tablet: slightly tighter sidebar */
        @media (min-width: 768px) and (max-width: 1024px) {
          .editor-sidebar {
            width: 240px;
          }
        }
      `}</style>
    </>
  )
}