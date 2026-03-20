import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Icons } from './icons'
import { Card, ArticleRowItem, SkeletonRows, type ArticleRow } from './ui'

interface Props {
  articles: ArticleRow[]
  loading: boolean
  deleting: string | null
  onDelete: (id: string) => void
}

export function ArticlesTab({ articles, loading, deleting, onDelete }: Props) {
  const router = useRouter()
  
  // Track which article is currently being PTP'd (null = none)
  const [ptping, setPtping] = useState < string | null > (null)
  // Track per-article result: 'done' | 'error' | null
  const [ptpResult, setPtpResult] = useState < Record < string, 'done' | 'error' >> ({})
  
  const byStatus = {
    published: articles.filter(a => a.status === 'published').length,
    draft: articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
  }
  
  async function handlePTP(articleId: string) {
    if (ptping) return // prevent concurrent PTP calls
    setPtping(articleId)
    setPtpResult(prev => ({ ...prev, [articleId]: undefined as any }))
    
    try {
      const res = await fetch('/api/ptp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })
      
      if (res.ok) {
        setPtpResult(prev => ({ ...prev, [articleId]: 'done' }))
        // Clear the success indicator after 4 seconds
        setTimeout(() => setPtpResult(prev => ({ ...prev, [articleId]: undefined as any })), 4000)
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('[PTP] failed:', data.error)
        setPtpResult(prev => ({ ...prev, [articleId]: 'error' }))
        setTimeout(() => setPtpResult(prev => ({ ...prev, [articleId]: undefined as any })), 4000)
      }
    } catch (e) {
      console.error('[PTP] network error:', e)
      setPtpResult(prev => ({ ...prev, [articleId]: 'error' }))
      setTimeout(() => setPtpResult(prev => ({ ...prev, [articleId]: undefined as any })), 4000)
    } finally {
      setPtping(null)
    }
  }
  
  return (
    <Card
      title={`All articles (${articles.length})`}
      action={
        <Link
          href="/write"
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}
        >
          {Icons.plus} New
        </Link>
      }
    >
      {/* Status summary pills */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Published', count: byStatus.published, bg: '#EAF3DE', text: '#3B6D11' },
          { label: 'Draft',     count: byStatus.draft,     bg: '#FAEEDA', text: '#854F0B' },
          { label: 'Scheduled', count: byStatus.scheduled, bg: '#E6F1FB', text: '#185FA5' },
        ].map(s => (
          <span
            key={s.label}
            style={{
              fontSize: 11,
              padding: '2px 9px',
              borderRadius: 20,
              background: s.bg,
              color: s.text,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {s.count} {s.label}
          </span>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={6} height={14} />
      ) : articles.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No articles yet.</p>
          <Link
            href="/write"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}
          >
            {Icons.plus} Write your first article
          </Link>
        </div>
      ) : (
        <div>
          {articles.map(a => (
            <div key={a.id} style={{ position: 'relative' }}>
              <ArticleRowItem
                article={a}
                showActions
                onEdit={id => router.push(`/write?edit=${id}`)}
                onDelete={onDelete}
                deleting={deleting}
              />

              {/* PTP button — overlaid on the right of each row */}
              <button
                onClick={() => handlePTP(a.id)}
                disabled={!!ptping}
                title="Post to Page (Facebook)"
                style={{
                  position: 'absolute',
                  right: 56,          // sit just left of the existing action buttons
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: ptping ? 'not-allowed' : 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Syne', sans-serif",
                  transition: 'background 0.2s, color 0.2s',
                  ...(ptpResult[a.id] === 'done'
                    ? { background: '#EAF3DE', color: '#3B6D11' }
                    : ptpResult[a.id] === 'error'
                    ? { background: '#FEE2E2', color: '#991B1B' }
                    : ptping === a.id
                    ? { background: '#E6F1FB', color: '#185FA5' }
                    : { background: '#F3F4F6', color: '#374151' }),
                }}
              >
                {ptping === a.id ? (
                  <>
                    <SpinnerIcon />
                    Posting…
                  </>
                ) : ptpResult[a.id] === 'done' ? (
                  <>✓ Posted</>
                ) : ptpResult[a.id] === 'error' ? (
                  <>✗ Failed</>
                ) : (
                  <>
                    <FbIcon />
                    PTP
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Tiny inline icons ────────────────────────────────────────────────────────

function FbIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
    </svg>
  )
}