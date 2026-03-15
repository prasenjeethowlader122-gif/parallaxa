'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Rss,
  Zap,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineArticle {
  sourceUrl: string
  title: string | null
  status: 'pending' | 'done' | 'failed'
  articleId: string | null
  error?: string
}

interface PipelineJob {
  id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string | Date
  updatedAt: string | Date
  error?: string
  progress: { total: number; done: number; failed: number }
  articles: PipelineArticle[]
}

// ─── Status config ────────────────────────────────────────────────────────────

const JOB_STATUS = {
  pending:  { label: 'Pending',  bg: '#f3f4f6', text: '#6b7280', icon: Clock },
  running:  { label: 'Running',  bg: '#dbeafe', text: '#1d4ed8', icon: Loader2 },
  done:     { label: 'Done',     bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
  failed:   { label: 'Failed',   bg: '#fee2e2', text: '#b91c1c', icon: XCircle },
} as const

const ARTICLE_STATUS = {
  pending: { label: 'Pending', bg: '#f3f4f6', text: '#6b7280' },
  done:    { label: 'Done',    bg: '#dcfce7', text: '#15803d' },
  failed:  { label: 'Failed',  bg: '#fee2e2', text: '#b91c1c' },
} as const

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = JOB_STATUS[status as keyof typeof JOB_STATUS] ?? JOB_STATUS.pending
  const Icon = cfg.icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 99,
        background: cfg.bg,
        color: cfg.text,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon
        size={11}
        style={{ animation: status === 'running' ? 'spin 1s linear infinite' : 'none' }}
      />
      {cfg.label}
    </span>
  )
}

function ArticleBadge({ status }: { status: string }) {
  const cfg = ARTICLE_STATUS[status as keyof typeof ARTICLE_STATUS] ?? ARTICLE_STATUS.pending
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 99,
        background: cfg.bg,
        color: cfg.text,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  )
}

function ProgressBar({ done, failed, total }: { done: number; failed: number; total: number }) {
  if (total === 0) return null
  const donePct = Math.round((done / total) * 100)
  const failedPct = Math.round((failed / total) * 100)
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#94a3b8',
          marginBottom: 6,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        <span>
          <span style={{ color: '#15803d', fontWeight: 700 }}>{done} done</span>
          {failed > 0 && <> · <span style={{ color: '#b91c1c', fontWeight: 700 }}>{failed} failed</span></>}
          {' · '}{total - done - failed} pending
        </span>
        <span style={{ fontWeight: 700, color: '#475569' }}>{donePct}%</span>
      </div>
      <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden', display: 'flex' }}>
        {donePct > 0 && (
          <div
            style={{
              width: `${donePct}%`,
              background: '#000',
              borderRadius: 99,
              transition: 'width 0.5s ease',
            }}
          />
        )}
        {failedPct > 0 && (
          <div
            style={{
              width: `${failedPct}%`,
              background: '#dc2626',
              transition: 'width 0.5s ease',
            }}
          />
        )}
      </div>
    </div>
  )
}

function ArticleRow({ article, index }: { article: PipelineArticle; index: number }) {
  const [open, setOpen] = useState(false)
  const hostname = (() => {
    try { return new URL(article.sourceUrl).hostname.replace('www.', '') }
    catch { return article.sourceUrl }
  })()

  return (
    <div
      style={{
        borderBottom: '1px solid #f1f5f9',
        transition: 'background 0.1s',
      }}
    >
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 16px',
          cursor: 'pointer',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Index */}
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#94a3b8',
            flexShrink: 0,
            fontFamily: "'DM Mono', monospace",
          }}
        >
          {index + 1}
        </span>

        {/* Title / URL */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: article.title ? '#1e293b' : '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {article.title ?? (
              article.status === 'pending' ? 'Pending…' :
              article.status === 'failed'  ? 'Failed to process' :
              'Untitled'
            )}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
            {hostname}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {article.articleId && (
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
              #{article.articleId.slice(0, 8)}
            </span>
          )}
          <ArticleBadge status={article.status} />
          {open ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div
          style={{
            padding: '0 16px 14px 50px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Source URL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExternalLink size={11} color="#94a3b8" />
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                color: '#3b82f6',
                textDecoration: 'none',
                fontFamily: "'DM Mono', monospace",
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 480,
              }}
            >
              {article.sourceUrl}
            </a>
          </div>

          {/* Error */}
          {article.error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '8px 12px',
                background: '#fff5f5',
                border: '1px solid #fecaca',
                borderRadius: 6,
                fontSize: 12,
                color: '#b91c1c',
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <AlertTriangle size={12} style={{ marginTop: 2, flexShrink: 0 }} />
              {article.error}
            </div>
          )}

          {/* View article */}
          {article.articleId && (
            <Link
              href={`/articles/${article.articleId}`}
              target="_blank"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: '#000',
                textDecoration: 'none',
                width: 'fit-content',
              }}
            >
              <ExternalLink size={12} />
              View published article →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

function JobCard({
  job,
  selected,
  onClick,
}: {
  job: PipelineJob
  selected: boolean
  onClick: () => void
}) {
  const total = job.progress.total
  const done  = job.progress.done
  const pct   = total > 0 ? Math.round(((done + job.progress.failed) / total) * 100) : 0

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #f1f5f9',
        borderLeft: selected ? '3px solid #000' : '3px solid transparent',
        background: selected ? '#f8fafc' : 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: '#1e293b' }}>
          #{job.id.slice(-8)}
        </span>
        <StatusBadge status={job.status} />
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: total > 0 ? 6 : 0 }}>
        {new Date(job.createdAt).toLocaleString()}
      </div>
      {total > 0 && (
        <div style={{ background: '#e2e8f0', borderRadius: 99, height: 3 }}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: job.status === 'failed' ? '#dc2626' : '#000',
              borderRadius: 99,
              transition: 'width 0.4s',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [jobs, setJobs]         = useState<PipelineJob[]>([])
  const [selected, setSelected] = useState<PipelineJob | null>(null)
  const [starting, setStarting] = useState(false)
  const [loading, setLoading]   = useState(true)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // ── Fetch all jobs ──────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline')
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {}
  }, [])

  // ── Fetch single job ────────────────────────────────────────────────────────

  const fetchJob = useCallback(async (jobId: string): Promise<PipelineJob | null> => {
    try {
      const res = await fetch(`/api/pipeline/${jobId}`)
      if (!res.ok) return null
      const data = await res.json()
      if (data.job) {
        setSelected(data.job)
        return data.job
      }
    } catch {}
    return null
  }, [])

  // ── Polling ─────────────────────────────────────────────────────────────────

  const startPolling = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const job = await fetchJob(jobId)
      await fetchJobs()
      if (job?.status === 'done' || job?.status === 'failed') {
        clearInterval(pollRef.current!)
        pollRef.current = null
      }
    }, 2500)
  }, [fetchJob, fetchJobs])

  useEffect(() => {
    fetchJobs().finally(() => setLoading(false))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchJobs])

  // ── Start new job ───────────────────────────────────────────────────────────

  const startJob = async () => {
    setStarting(true)
    try {
      const res = await fetch('/api/pipeline', { method: 'POST' })
      const { jobId, eventId } = await res.json()
      const id = jobId ?? eventId
      await fetchJobs()
      if (id) {
        await fetchJob(id)
        startPolling(id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setStarting(false)
    }
  }

  const selectJob = async (job: PipelineJob) => {
    await fetchJob(job.id)
    if (job.status === 'running' || job.status === 'pending') startPolling(job.id)
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const total   = selected?.progress.total   ?? 0
  const done    = selected?.progress.done    ?? 0
  const failed  = selected?.progress.failed  ?? 0
  const pending = total - done - failed

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.3 }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <Header />

        {/* ── Page header ── */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '18px 32px',
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            {/* Left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Link
                href="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: '#64748b',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <ArrowLeft size={14} /> Dashboard
              </Link>
              <span style={{ color: '#e2e8f0' }}>|</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Rss size={16} color="#fff" />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    AI News Pipeline
                  </h1>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                    Crawl → Scrape → Generate → Publish
                  </p>
                </div>
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={startJob}
              disabled={starting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 20px',
                background: starting ? '#475569' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: starting ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                letterSpacing: '-0.01em',
              }}
            >
              {starting
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</>
                : <><Zap size={14} /> Run New Job</>
              }
            </button>
          </div>
        </div>

        {/* ── Stats strip (only when a job is selected) ── */}
        {selected && (
          <div
            style={{
              background: '#fff',
              borderBottom: '1px solid #e2e8f0',
              padding: '10px 32px',
            }}
          >
            <div
              style={{
                maxWidth: 1200,
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'Total',   value: total,   color: '#1e293b' },
                { label: 'Done',    value: done,    color: '#15803d' },
                { label: 'Failed',  value: failed,  color: '#b91c1c' },
                { label: 'Pending', value: pending, color: '#854F0B' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color,
                      fontFamily: "'DM Mono', monospace",
                      lineHeight: 1,
                    }}
                  >
                    {value}
                  </span>
                  <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {label}
                  </span>
                </div>
              ))}

              {selected.status === 'running' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: '#1d4ed8',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      animation: 'pulse-dot 1.2s ease infinite',
                    }}
                  />
                  Live
                  <button
                    onClick={() => startPolling(selected.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #dbeafe',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: 10,
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={10} /> Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Main layout ── */}
        <div style={{ flex: 1, maxWidth: 1200, margin: '0 auto', width: '100%', padding: '24px 32px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Sidebar: job list */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Jobs
              </span>
              <button
                onClick={fetchJobs}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  display: 'flex',
                  padding: 4,
                }}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                </div>
              ) : jobs.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>No jobs yet.</p>
                </div>
              ) : (
                jobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    selected={selected?.id === job.id}
                    onClick={() => selectJob(job)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div
                style={{
                  background: '#fff',
                  border: '1px dashed #e2e8f0',
                  borderRadius: 12,
                  padding: '80px 40px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Rss size={28} color="#94a3b8" />
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
                  No job selected
                </h2>
                <p style={{ margin: '0 0 24px', fontSize: 13, color: '#94a3b8' }}>
                  Select a job from the list, or start a new pipeline run.
                </p>
                <button
                  onClick={startJob}
                  disabled={starting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 22px',
                    background: '#000',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Zap size={14} /> Run New Job
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Job summary card */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: '18px 22px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 800,
                          color: '#0f172a',
                          fontFamily: "'DM Mono', monospace",
                          letterSpacing: '-0.02em',
                        }}
                      >
                        Job #{selected.id.slice(-8)}
                      </h2>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>
                        Started {new Date(selected.createdAt).toLocaleString()}
                        {' · '}
                        Updated {new Date(selected.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={selected.status} />
                  </div>

                  {selected.error && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        background: '#fff5f5',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      <AlertTriangle size={14} />
                      {selected.error}
                    </div>
                  )}

                  <ProgressBar done={done} failed={failed} total={total} />
                </div>

                {/* Article list */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Articles ({selected.articles.length})
                    </span>
                    {/* Pills summary */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {done > 0 && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                          {done} done
                        </span>
                      )}
                      {failed > 0 && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#fee2e2', color: '#b91c1c', fontWeight: 700 }}>
                          {failed} failed
                        </span>
                      )}
                      {pending > 0 && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280', fontWeight: 700 }}>
                          {pending} pending
                        </span>
                      )}
                    </div>
                  </div>

                  {selected.articles.length === 0 ? (
                    <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      {selected.status === 'running' || selected.status === 'pending'
                        ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                            <p style={{ margin: 0, fontSize: 13 }}>Crawling Yahoo News…</p>
                          </div>
                        )
                        : <p style={{ margin: 0, fontSize: 13 }}>No articles processed.</p>
                      }
                    </div>
                  ) : (
                    selected.articles.map((article, i) => (
                      <ArticleRow key={i} article={article} index={i} />
                    ))
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}