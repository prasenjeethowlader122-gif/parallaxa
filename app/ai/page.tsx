'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PipelineJob, PipelineArticle } from '@/lib/news-pipeline'

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record < string, React.CSSProperties > = {
  done: { background: '#dcfce7', color: '#15803d' },
  running: { background: '#dbeafe', color: '#1d4ed8' },
  failed: { background: '#fee2e2', color: '#b91c1c' },
  pending: { background: '#f3f4f6', color: '#6b7280' },
}

function Badge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: 11, padding: '2px 10px', borderRadius: 99, fontWeight: 600,
      whiteSpace: 'nowrap', ...(STATUS_STYLE[status] ?? STATUS_STYLE.pending),
    }}>
      {status}
    </span>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function NewsDashboard() {
  const [jobs, setJobs] = useState < PipelineJob[] > ([])
  const [selected, setSelected] = useState < PipelineJob | null > (null)
  const [starting, setStarting] = useState(false)
  const [expanded, setExpanded] = useState < string | null > (null)
  const pollRef = useRef < NodeJS.Timeout | null > (null)
  
  // ── Data fetching ───────────────────────────────────────────────────────────
  
  const loadJobs = useCallback(async () => {
    const res = await fetch('/api/pipeline')
    const data = await res.json()
    setJobs(data.jobs ?? [])
  }, [])
  
  const loadJob = useCallback(async (jobId: string): Promise < PipelineJob | null > => {
    const res = await fetch(`/api/pipeline/${jobId}`)
    const data = await res.json()
    if (data.job) {
      setSelected(data.job)
      return data.job as PipelineJob
    }
    return null
  }, [])
  
  const startPolling = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const job = await loadJob(jobId)
      await loadJobs()
      if (job?.status === 'done' || job?.status === 'failed') {
        clearInterval(pollRef.current!)
      }
    }, 3000)
  }, [loadJob, loadJobs])
  
  useEffect(() => {
    loadJobs()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadJobs])
  
  // ── Actions ─────────────────────────────────────────────────────────────────
  
  async function startJob() {
    setStarting(true)
    try {
      const res = await fetch('/api/pipeline', { method: 'POST' })
      const { jobId } = await res.json()
      await loadJobs()
      await loadJob(jobId)
      startPolling(jobId)
    } finally {
      setStarting(false)
    }
  }
  
  async function selectJob(job: PipelineJob) {
    await loadJob(job.id)
    if (job.status === 'running') startPolling(job.id)
  }
  
  // ── Progress ─────────────────────────────────────────────────────────────────
  
  const total = selected?.articles.length ?? 0
  const done = selected?.articles.filter(a => a.status === 'done').length ?? 0
  const failed = selected?.articles.filter(a => a.status === 'failed').length ?? 0
  const progress = total > 0 ? Math.round(((done + failed) / total) * 100) : 0
  
  // ── Render ────────────────────────────────────────────────────────────────────
  
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', background: '#f8fafc', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#0f172a', color: '#fff', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>📰 Yahoo News AI Pipeline</h1>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Crawl → Scrape → HuggingFace AI → Neon PostgreSQL
          </p>
        </div>
        <button
          onClick={startJob}
          disabled={starting}
          style={{
            background: starting ? '#475569' : '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8, padding: '10px 22px',
            fontSize: 14, fontWeight: 600,
            cursor: starting ? 'not-allowed' : 'pointer',
          }}
        >
          {starting ? '⏳ Starting…' : '▶ Run New Job'}
        </button>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 68px)' }}>

        {/* Sidebar */}
        <div style={{ width: 260, background: '#fff', borderRight: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Jobs
          </div>
          {jobs.length === 0 && (
            <p style={{ padding: 20, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
              No jobs yet.
            </p>
          )}
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => selectJob(job)}
              style={{
                padding: '11px 16px', cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                background: selected?.id === job.id ? '#eff6ff' : 'transparent',
                borderLeft: selected?.id === job.id ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>#{job.id.slice(-8)}</span>
                <Badge status={job.status} />
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                {new Date(job.createdAt).toLocaleString()}
              </div>
              {job.progress.total > 0 && (
                <div style={{ marginTop: 6, background: '#e2e8f0', borderRadius: 99, height: 4 }}>
                  <div style={{
                    width: `${Math.round(((job.progress.done + job.progress.failed) / job.progress.total) * 100)}%`,
                    height: '100%', background: '#3b82f6', borderRadius: 99,
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {!selected ? (
            <div style={{ textAlign: 'center', marginTop: 80, color: '#94a3b8' }}>
              <div style={{ fontSize: 48 }}>📋</div>
              <p>Select a job or start a new one.</p>
            </div>
          ) : (
            <>
              {/* Job summary card */}
              <div style={{ background: '#fff', borderRadius: 12, padding: '18px 22px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Job {selected.id}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                      {new Date(selected.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge status={selected.status} />
                </div>

                {selected.error && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: '#fee2e2', borderRadius: 6, fontSize: 13, color: '#b91c1c' }}>
                    {selected.error}
                  </div>
                )}

                {total > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 5 }}>
                      <span>✓ {done} done &nbsp;·&nbsp; ✗ {failed} failed &nbsp;·&nbsp; ⏳ {total - done - failed} pending</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8 }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: '#3b82f6', borderRadius: 99, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Article list */}
              {selected.articles.length === 0 && (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
                  {selected.status === 'running' ? '⏳ Crawling Yahoo News…' : 'No articles yet.'}
                </p>
              )}

              {selected.articles.map((article: PipelineArticle, i: number) => (
                <div
                  key={i}
                  style={{ background: '#fff', borderRadius: 10, marginBottom: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
                >
                  <div
                    style={{ padding: '12px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpanded(expanded === `${i}` ? null : `${i}`)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: article.title ? '#1e293b' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {article.title
                          ?? (article.status === 'pending' ? '⏳ Pending…'
                          : article.status === 'failed'  ? '✗ Failed'
                          : 'Untitled')}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <a
                          href={article.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#3b82f6', textDecoration: 'none' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {article.sourceUrl}
                        </a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 14 }}>
                      {article.articleId && (
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>id:{article.articleId.slice(0,8)}</span>
                      )}
                      <Badge status={article.status} />
                      <span style={{ color: '#94a3b8' }}>{expanded === `${i}` ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded === `${i}` && article.error && (
                    <div style={{ borderTop: '1px solid #fee2e2', padding: '10px 18px', background: '#fff5f5', fontSize: 13, color: '#b91c1c' }}>
                      ⚠ {article.error}
                    </div>
                  )}

                  {expanded === `${i}` && article.articleId && (
                    <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 18px', background: '#f8fafc', fontSize: 13, color: '#334155' }}>
                      ✓ Saved to Neon —{' '}
                      <a
                        href={`/articles/${article.articleId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View article →
                      </a>
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