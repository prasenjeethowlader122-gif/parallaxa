'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────

interface Job {
  id: number
  status: string
  created_at: string
  updated_at: string
  error: string | null
}

interface Article {
  id: number
  job_id: number
  source_url: string
  source_title: string | null
  hero_image: string | null
  title: string | null
  body: string | null
  status: string
  created_at: string
  error: string | null
}

interface JobDetail {
  job: Job
  articles: Article[]
  counts: { total: number; done: number; failed: number; pending: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function statusColor(status: string) {
  switch (status) {
    case 'done':    return '#16a34a'
    case 'running': return '#2563eb'
    case 'failed':  return '#dc2626'
    default:        return '#9ca3af'
  }
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    done:    'background:#dcfce7;color:#15803d',
    running: 'background:#dbeafe;color:#1d4ed8',
    failed:  'background:#fee2e2;color:#b91c1c',
    pending: 'background:#f3f4f6;color:#6b7280',
  }
  return colors[status] ?? colors.pending
}

// ─── Component ────────────────────────────────────────────────────────────

export default function NewsDashboard() {
  const [jobs, setJobs]               = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null)
  const [starting, setStarting]       = useState(false)
  const [expanded, setExpanded]       = useState<number | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Load job list
  const loadJobs = useCallback(async () => {
    const res = await fetch('/api/jobs')
    const data = await res.json()
    setJobs(data.jobs ?? [])
  }, [])

  // Load detail for a specific job
  const loadJobDetail = useCallback(async (jobId: number) => {
    const res = await fetch(`/api/jobs/${jobId}`)
    const data: JobDetail = await res.json()
    setSelectedJob(data)
    return data
  }, [])

  // Auto-poll while a job is running
  const startPolling = useCallback((jobId: number) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const detail = await loadJobDetail(jobId)
      await loadJobs()
      if (detail.job.status === 'done' || detail.job.status === 'failed') {
        clearInterval(pollRef.current!)
      }
    }, 3000)
  }, [loadJobDetail, loadJobs])

  useEffect(() => {
    loadJobs()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadJobs])

  // Start a new job
  async function startJob() {
    setStarting(true)
    try {
      const res = await fetch('/api/jobs', { method: 'POST' })
      const { jobId } = await res.json()
      await loadJobs()
      await loadJobDetail(jobId)
      startPolling(jobId)
    } finally {
      setStarting(false)
    }
  }

  // Select a job
  async function selectJob(job: Job) {
    await loadJobDetail(job.id)
    if (job.status === 'running') startPolling(job.id)
  }

  const progress = selectedJob
    ? Math.round(((selectedJob.counts.done + selectedJob.counts.failed) / Math.max(selectedJob.counts.total, 1)) * 100)
    : 0

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', padding: '0' }}>

      {/* Header */}
      <div style={{ background: '#1e293b', color: '#fff', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>📰 Yahoo News Pipeline</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Crawl → Scrape → AI Generate → SQLite</p>
        </div>
        <button
          onClick={startJob}
          disabled={starting}
          style={{
            background: starting ? '#475569' : '#3b82f6',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 22px', fontSize: 14, fontWeight: 600,
            cursor: starting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {starting ? '⏳ Starting…' : '▶ Start New Job'}
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 72px)' }}>

        {/* Sidebar – Job list */}
        <div style={{ width: 280, background: '#fff', borderRight: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Recent Jobs
          </div>
          {jobs.length === 0 && (
            <div style={{ padding: 20, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
              No jobs yet.<br />Click "Start New Job" to begin.
            </div>
          )}
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => selectJob(job)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                background: selectedJob?.job.id === job.id ? '#eff6ff' : 'transparent',
                borderLeft: selectedJob?.job.id === job.id ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Job #{job.id}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, ...Object.fromEntries((statusBadge(job.status)).split(';').map(s => s.split(':'))) }}>
                  {job.status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {new Date(job.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Main – Job detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {!selectedJob ? (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#94a3b8' }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <p style={{ fontSize: 15 }}>Select a job from the sidebar, or start a new one.</p>
            </div>
          ) : (
            <>
              {/* Job header */}
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Job #{selectedJob.job.id}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                      Started {new Date(selectedJob.job.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: statusColor(selectedJob.job.status) }}>
                      {selectedJob.job.status.toUpperCase()}
                    </div>
                    {selectedJob.job.error && (
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{selectedJob.job.error}</div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {selectedJob.counts.total > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      <span>{selectedJob.counts.done} done · {selectedJob.counts.failed} failed · {selectedJob.counts.pending} pending</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: '#3b82f6', borderRadius: 99, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Articles */}
              {selectedJob.articles.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                  {selectedJob.job.status === 'running' ? '⏳ Crawling Yahoo News…' : 'No articles yet.'}
                </div>
              )}

              {selectedJob.articles.map(article => (
                <div
                  key={article.id}
                  style={{ background: '#fff', borderRadius: 12, marginBottom: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
                >
                  {/* Article card header */}
                  <div
                    style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: article.title ? '#1e293b' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {article.title ?? (article.status === 'pending' ? '⏳ Generating…' : article.status === 'failed' ? '✗ Failed' : 'Untitled')}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <a href={article.source_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                          {article.source_url}
                        </a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 16 }}>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 99, whiteSpace: 'nowrap', ...Object.fromEntries((statusBadge(article.status)).split(';').map(s => s.split(':'))) }}>
                        {article.status}
                      </span>
                      <span style={{ color: '#94a3b8', fontSize: 16 }}>{expanded === article.id ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Expanded article body */}
                  {expanded === article.id && article.body && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 20px' }}>
                      {article.hero_image && (
                        <img
                          src={article.hero_image}
                          alt="hero"
                          style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, marginBottom: 14 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      {article.body.split('\n').filter(Boolean).map((para, i) => (
                        <p key={i} style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Error message */}
                  {expanded === article.id && article.error && (
                    <div style={{ borderTop: '1px solid #fee2e2', padding: '12px 20px', background: '#fff5f5', fontSize: 13, color: '#b91c1c' }}>
                      ⚠ {article.error}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
