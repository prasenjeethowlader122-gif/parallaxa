import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Icons } from './icons'
import { Card, ArticleRowItem, SkeletonRows, type ArticleRow } from './ui'

interface Props {
  articles: ArticleRow[]
  loading: boolean
  deleting: string | null
  onDelete: (id: string) => void
}

type PtpStatus = 'idle' | 'queued' | 'running' | 'done' | 'error'

export function ArticlesTab({ articles, loading, deleting, onDelete  , userRole}: Props) {
  const router = useRouter()

  // Per-article PTP status
  const [ptpStatus, setPtpStatus] = useState<Record<string, PtpStatus>>({})
  // Polling interval refs per article
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  function setStatus(id: string, s: PtpStatus) {
    setPtpStatus(prev => ({ ...prev, [id]: s }))
  }

  function startPolling(articleId: string, eventId: string) {
    // Clear any existing interval for this article
    if (pollRefs.current[articleId]) clearInterval(pollRefs.current[articleId])

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pipeline/${eventId}`)
        if (!res.ok) return

        const data = await res.json() as { status: string }

        if (data.status === 'done') {
          clearInterval(pollRefs.current[articleId])
          delete pollRefs.current[articleId]
          setStatus(articleId, 'done')
          setTimeout(() => setStatus(articleId, 'idle'), 5_000)
        } else if (data.status === 'failed') {
          clearInterval(pollRefs.current[articleId])
          delete pollRefs.current[articleId]
          setStatus(articleId, 'error')
          setTimeout(() => setStatus(articleId, 'idle'), 5_000)
        }
        // 'pending' | 'running' — keep polling
      } catch {
        // network blip — keep polling
      }
    }, 2_500)

    pollRefs.current[articleId] = interval
  }

  async function handlePTP(articleId: string) {
    const current = ptpStatus[articleId] ?? 'idle'
    if (current === 'queued' || current === 'running') return

    setStatus(articleId, 'queued')

    try {
      const res = await fetch('/api/ptp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        console.error('[PTP] failed to queue:', data.error)
        setStatus(articleId, 'error')
        setTimeout(() => setStatus(articleId, 'idle'), 4_000)
        return
      }

      const { eventId } = await res.json() as { eventId: string }
      setStatus(articleId, 'running')
      startPolling(articleId, eventId)
    } catch (e) {
      console.error('[PTP] network error:', e)
      setStatus(articleId, 'error')
      setTimeout(() => setStatus(articleId, 'idle'), 4_000)
    }
  }

  const byStatus = {
    published: articles.filter(a => a.status === 'published').length,
    draft:     articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
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
          {articles.map(a => {
            const status = ptpStatus[a.id] ?? 'idle'
            const busy = status === 'queued' || status === 'running'

            return (
              <div key={a.id} style={{ position: 'relative' }}>
                <ArticleRowItem
                  article={a}
                  showActions
                  onEdit={id => router.push(`/write?edit=${id}`)}
                  onDelete={onDelete}
                  deleting={deleting}
                />
                {userRole === 'admin' && (
                
                <button
                  onClick={() => handlePTP(a.id)}
                  disabled={busy}
                  title="Post to Page (Facebook)"
                  style={{
                    position: 'absolute',
                    right: 56,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'Syne', sans-serif",
                    transition: 'background 0.2s, color 0.2s',
                    ...(status === 'done'
                      ? { background: '#EAF3DE', color: '#3B6D11' }
                      : status === 'error'
                      ? { background: '#FEE2E2', color: '#991B1B' }
                      : busy
                      ? { background: '#E6F1FB', color: '#185FA5' }
                      : { background: '#F3F4F6', color: '#374151' }),
                  }}
                >
                  {status === 'queued' ? (
                    <><SpinnerIcon /> Queued…</>
                  ) : status === 'running' ? (
                    <><SpinnerIcon /> Posting…</>
                  ) : status === 'done' ? (
                    <>✓ Posted</>
                  ) : status === 'error' ? (
                    <>✗ Failed</>
                  ) : (
                    <><FbIcon /> PTP</>
                  )}
                </button>
                  
                )}
              </div>
            )
          })}
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