import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'
import { Icons } from './icons'
import { Card, ArticleRowItem, SkeletonRows, SearchInput, TabBar, type ArticleRow } from './ui'

interface Props {
  articles: ArticleRow[]
  loading: boolean
  deleting: string | null
  onDelete: (id: string) => void
  userRole?: string
}

type PtpStatus = 'idle' | 'queued' | 'running' | 'done' | 'error'
type StatusFilter = 'All' | 'Published' | 'Draft' | 'Scheduled'

const STATUS_META = {
  published: { bg: '#EAF3DE', color: '#3B6D11', dot: '#639922', border: '#C0DD97' },
  draft:     { bg: '#FAEEDA', color: '#854F0B', dot: '#EF9F27', border: '#FAC775' },
  scheduled: { bg: '#E6F1FB', color: '#185FA5', dot: '#378ADD', border: '#B5D4F4' },
} as const

export function ArticlesTab({ articles, loading, deleting, onDelete, userRole }: Props) {
  const router = useRouter()

  const [ptpStatus, setPtpStatus]       = useState<Record<string, PtpStatus>>({})
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  function setStatus(id: string, s: PtpStatus) {
    setPtpStatus(prev => ({ ...prev, [id]: s }))
  }

  function startPolling(articleId: string, eventId: string) {
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
          setTimeout(() => setStatus(articleId, 'idle'), 4_000)
        }
      } catch { /* keep polling */ }
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

  const filtered = articles.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'All' || a.status === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.5px',
            color: 'var(--text-primary)',
            fontFamily: "'Syne', sans-serif",
            lineHeight: 1.1,
          }}>
            Articles
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {(['published', 'draft', 'scheduled'] as const).map((s, i) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {i > 0 && <span style={{ opacity: 0.3 }}>·</span>}
                <span style={{
                  display: 'inline-block',
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: STATUS_META[s].dot,
                  flexShrink: 0,
                }} />
                <span style={{ color: STATUS_META[s].color, fontWeight: 600 }}>{byStatus[s]}</span>
                <span style={{ color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{s}</span>
              </span>
            ))}
          </p>
        </div>

        <Link
          href="/write"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '9px 18px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            textDecoration: 'none',
            fontFamily: "'Syne', sans-serif",
            flexShrink: 0,
            letterSpacing: '0.01em',
            transition: 'opacity 0.15s, transform 0.15s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.opacity = '0.88'
            el.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }}
        >
          {Icons.plus} New article
        </Link>
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        padding: '12px 16px',
        background: 'var(--card-bg)',
        border: '0.5px solid var(--border)',
        borderRadius: 14,
      }}>
        <TabBar
          tabs={['All', 'Published', 'Draft', 'Scheduled']}
          active={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
        />
        <div style={{ marginLeft: 'auto' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search articles…"
          />
        </div>
      </div>

      {/* ── Articles table ── */}
      <div style={{
        background: 'var(--card-bg)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: userRole === 'admin' ? '1fr 90px 90px 80px 90px 90px' : '1fr 90px 90px 80px 90px',
          gap: 0,
          padding: '10px 20px',
          borderBottom: '0.5px solid var(--border)',
          background: 'var(--hover-bg)',
        }}>
          {['Title', 'Category', 'Status', 'Views', 'Date', ...(userRole === 'admin' ? ['Actions'] : [])].map(col => (
            <span key={col} style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontFamily: "'DM Mono', monospace",
            }}>
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '8px 0' }}>
            <SkeletonRows count={6} height={14} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} statusFilter={statusFilter} />
        ) : (
          <div>
            {filtered.map((a, idx) => {
              const status = ptpStatus[a.id] ?? 'idle'
              const busy   = status === 'queued' || status === 'running'
              const isLast = idx === filtered.length - 1

              return (
                <div
                  key={a.id}
                  style={{
                    position: 'relative',
                    borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <ArticleRowItem
                    article={a}
                    showActions
                    onEdit={id => router.push(`/write?edit=${id}`)}
                    onDelete={onDelete}
                    deleting={deleting}
                  />

                  {userRole === 'admin' && (
                    <PtpButton
                      status={status}
                      busy={busy}
                      onClick={() => handlePTP(a.id)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: '10px 20px',
            borderTop: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}>
              {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
              {(search || statusFilter !== 'All') && ` · filtered from ${articles.length}`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ search, statusFilter }: { search: string; statusFilter: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '64px 24px',
      gap: 12,
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: 14,
        background: 'var(--hover-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)',
        fontSize: 22,
      }}>
        {search || statusFilter !== 'All' ? '🔍' : '📝'}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, fontFamily: "'Syne', sans-serif" }}>
          {search || statusFilter !== 'All' ? 'No matches found' : 'No articles yet'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
          {search || statusFilter !== 'All'
            ? 'Try different search terms or filters'
            : 'Start writing your first article'}
        </p>
      </div>
      {!search && statusFilter === 'All' && (
        <Link
          href="/write"
          style={{
            marginTop: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: 10,
            border: '0.5px solid var(--border)',
            background: 'var(--card-bg)',
            transition: 'border-color 0.15s',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Write your first article →
        </Link>
      )}
    </div>
  )
}

function PtpButton({ status, busy, onClick }: { status: PtpStatus; busy: boolean; onClick: () => void }) {
  const styles: Record<PtpStatus, { bg: string; color: string; border: string }> = {
    idle:    { bg: 'var(--hover-bg)',  color: 'var(--text-secondary)', border: 'var(--border)' },
    queued:  { bg: '#E6F1FB',          color: '#185FA5',               border: '#B5D4F4' },
    running: { bg: '#E6F1FB',          color: '#185FA5',               border: '#B5D4F4' },
    done:    { bg: '#EAF3DE',          color: '#3B6D11',               border: '#C0DD97' },
    error:   { bg: '#FCEBEB',          color: '#A32D2D',               border: '#F7C1C1' },
  }
  const s = styles[status]

  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Post to Page (Facebook)"
      style={{
        position: 'absolute',
        right: 76,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 12px',
        borderRadius: 8,
        border: `0.5px solid ${s.border}`,
        cursor: busy ? 'not-allowed' : 'pointer',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "'Syne', sans-serif",
        letterSpacing: '0.02em',
        background: s.bg,
        color: s.color,
        transition: 'background 0.2s, color 0.2s, opacity 0.15s',
        opacity: busy ? 0.8 : 1,
      }}
    >
      {status === 'queued'  && <><SpinnerIcon /> Queued…</>}
      {status === 'running' && <><SpinnerIcon /> Posting…</>}
      {status === 'done'    && <>✓ Posted</>}
      {status === 'error'   && <>✗ Failed</>}
      {status === 'idle'    && <><FbIcon /> PTP</>}
    </button>
  )
}

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