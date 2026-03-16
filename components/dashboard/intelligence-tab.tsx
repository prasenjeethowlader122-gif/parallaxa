'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from './ui'

interface Step {
  id: string
  name: string
  status: string
  duration?: number
  output?: any
  error?: string
}

interface PipelineJob {
  id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string
  updatedAt: string
  error?: string
  progress: { total: number; done: number; failed: number }
  articles: Array<{
    sourceUrl: string
    title: string | null
    status: 'pending' | 'done' | 'failed'
    articleId: string | null
    error?: string
  }>
  steps: Step[]
  startedAt?: string
  completedAt?: string
}

// How many consecutive "still pending" polls before we show a warning
const PENDING_WARN_AFTER = 10

export function IntelligenceTab() {
  const [isRunning, setIsRunning]       = useState(false)
  const [jobId, setJobId]               = useState<string | null>(null)
  const [job, setJob]                   = useState<PipelineJob | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [tick, setTick]                 = useState(0)   // forces re-render for elapsed timer
  const pendingCountRef                 = useRef(0)      // consecutive pending-only responses
  const startTimeRef                    = useRef<number | null>(null)

  // ── Fetch job status ──────────────────────────────────────────────────────
  const fetchJobStatus = async (id: string): Promise<PipelineJob | undefined> => {
    try {
      const res = await fetch(`/api/pipeline/${id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? `Status ${res.status}`)
        return
      }
      const data: PipelineJob = await res.json()
      setJob(data)
      return data
    } catch (err) {
      console.error('Failed to fetch job status:', err)
    }
  }

  // ── Poll while running or pending ─────────────────────────────────────────
  useEffect(() => {
    if (!jobId || !isRunning) return

    const interval = setInterval(async () => {
      const data = await fetchJobStatus(jobId)
      if (!data) return

      if (data.status === 'pending' && data.progress.total === 0) {
        // Still waiting for Inngest to assign a run
        pendingCountRef.current += 1
      } else {
        pendingCountRef.current = 0
      }

      if (data.status !== 'running' && data.status !== 'pending') {
        setIsRunning(false)
      }
    }, 2000)

    // Tick every second so the elapsed timer re-renders
    const ticker = setInterval(() => setTick((t) => t + 1), 1000)

    return () => {
      clearInterval(interval)
      clearInterval(ticker)
    }
  }, [jobId, isRunning])

  // ── Start pipeline ────────────────────────────────────────────────────────
  const handleStartPipeline = async () => {
    setLoading(true)
    setError(null)
    pendingCountRef.current = 0
    startTimeRef.current = Date.now()

    try {
      const res = await fetch('/api/pipeline', { method: 'POST' })

      if (!res.ok) {
        setError('Failed to start pipeline')
        return
      }

      const data = await res.json()
      // POST /api/pipeline returns { eventId }
      const eventId: string | null = data.eventId ?? null

      if (!eventId) {
        setError('No event ID returned from pipeline')
        return
      }

      setJobId(eventId)
      setIsRunning(true)
      fetchJobStatus(eventId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setJobId(null)
    setJob(null)
    setIsRunning(false)
    setError(null)
    setExpandedStep(null)
    pendingCountRef.current = 0
    startTimeRef.current = null
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': case 'completed': return '#3B6D11'
      case 'failed':                 return '#C1272D'
      case 'running':                return '#185FA5'
      case 'pending': case 'queued': return '#854F0B'
      default:                       return 'var(--text-tertiary)'
    }
  }

  const getStatusLabel = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1)

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000)  return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getStepIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': case 'done': return '✓'
      case 'failed':                 return '✕'
      case 'running':                return '▶'
      default:                       return '○'
    }
  }

  const elapsed = startTimeRef.current
    ? Math.floor((Date.now() - startTimeRef.current) / 1000)
    : 0

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }

  const pending = job
    ? job.progress.total - job.progress.done - job.progress.failed
    : 0

  const progressPct = job && job.progress.total > 0
    ? Math.round((job.progress.done / job.progress.total) * 100)
    : 0

  const isResolvingRun =
    isRunning &&
    job?.status === 'pending' &&
    job.progress.total === 0 &&
    pendingCountRef.current > 0

  const showPendingWarning = pendingCountRef.current >= PENDING_WARN_AFTER

  return (
    <div className="flex flex-col gap-4">
      <h1
        className="py-6 border-b"
        style={{ color: 'var(--text-primary)', fontWeight: 600 }}
      >
        Intelligence
      </h1>

      <Card title="News Pipeline">
        <div className="p-5 flex flex-col gap-5">

          {/* ── Live run indicator ─────────────────────────────────────────── */}
          {isRunning && (
            <div
              className="flex items-center gap-3 p-3 rounded-lg text-sm"
              style={{ background: '#E6F1FB', color: '#185FA5' }}
            >
              {/* Pulsing dot */}
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#185FA5', display: 'block',
                    animation: 'pulse 1.4s ease-in-out infinite',
                  }}
                />
              </span>
              <span style={{ fontWeight: 600 }}>
                {isResolvingRun ? 'Waiting for Inngest run to start…' : 'Pipeline running'}
              </span>
              {startTimeRef.current && (
                <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 12 }}>
                  {formatElapsed(elapsed)}
                </span>
              )}
            </div>
          )}

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%       { opacity: 0.4; transform: scale(1.4); }
            }
          `}</style>

          {showPendingWarning && (
            <div
              className="p-3 rounded-lg text-xs"
              style={{ background: '#FAEEDA', color: '#854F0B' }}
            >
              Still waiting for Inngest to assign a run. Check your{' '}
              <code>INNGEST_SIGNING_KEY</code> env var and that your Inngest
              function is registered at <code>/api/inngest</code>.
            </div>
          )}

          {/* ── Job status ────────────────────────────────────────────────── */}
          {job && job.status !== 'pending' && (
            <div className="space-y-4">

              {/* Status + progress grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Status</p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: getStatusColor(job.status) }}
                  >
                    {getStatusLabel(job.status)}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Progress</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {job.progress.done}/{job.progress.total}
                    {job.progress.total > 0 && (
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
                        ({progressPct}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar — only shown when we know the total */}
              {job.progress.total > 0 && (
                <div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden flex"
                    style={{ background: 'var(--hover-bg)' }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${(job.progress.done / job.progress.total) * 100}%`,
                        background: '#3B6D11',
                        transition: 'width 0.4s ease',
                      }}
                    />
                    <div
                      className="h-full"
                      style={{
                        width: `${(job.progress.failed / job.progress.total) * 100}%`,
                        background: '#C1272D',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Article stat pills */}
              {job.progress.total > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg text-center" style={{ background: '#EAF3DE' }}>
                    <p className="text-xs" style={{ color: '#3B6D11' }}>Done</p>
                    <p className="text-lg font-bold" style={{ color: '#3B6D11' }}>
                      {job.progress.done}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: '#FAEEDA' }}>
                    <p className="text-xs" style={{ color: '#854F0B' }}>Pending</p>
                    <p className="text-lg font-bold" style={{ color: '#854F0B' }}>
                      {pending}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: '#FBEAF0' }}>
                    <p className="text-xs" style={{ color: '#993556' }}>Failed</p>
                    <p className="text-lg font-bold" style={{ color: '#993556' }}>
                      {job.progress.failed}
                    </p>
                  </div>
                </div>
              )}

              {/* Execution Steps */}
              {job.steps.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Execution Steps
                  </h3>
                  <div
                    className="space-y-1.5"
                    style={{ background: 'var(--hover-bg)', borderRadius: 8, padding: 12 }}
                  >
                    {job.steps.map((step) => (
                      <div key={step.id} className="space-y-1">
                        <button
                          onClick={() =>
                            setExpandedStep(expandedStep === step.id ? null : step.id)
                          }
                          className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left"
                          style={{
                            background: 'var(--card-bg)',
                            border: `1px solid ${getStatusColor(step.status)}`,
                          }}
                        >
                          <span
                            style={{
                              color: getStatusColor(step.status),
                              fontWeight: 'bold',
                              minWidth: 20,
                              textAlign: 'center',
                            }}
                          >
                            {getStepIcon(step.status)}
                          </span>
                          <p
                            className="flex-1 text-xs font-semibold truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {step.name}
                          </p>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                            {formatDuration(step.duration)}
                          </span>
                          <span
                            style={{
                              color: 'var(--text-tertiary)',
                              transform: expandedStep === step.id ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}
                          >
                            ›
                          </span>
                        </button>

                        {expandedStep === step.id && (
                          <div
                            className="p-3 rounded-lg text-xs space-y-2"
                            style={{ background: 'var(--card-bg)', marginLeft: 8 }}
                          >
                            <div>
                              <p style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>STATUS</p>
                              <p style={{ color: getStatusColor(step.status), fontWeight: 600 }}>
                                {getStatusLabel(step.status)}
                              </p>
                            </div>
                            {step.error && (
                              <div>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>ERROR</p>
                                <p style={{ color: '#C1272D' }}>{step.error}</p>
                              </div>
                            )}
                            {step.output && (
                              <div>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>OUTPUT</p>
                                <pre
                                  style={{
                                    background: 'var(--hover-bg)',
                                    padding: '6px 8px',
                                    borderRadius: 4,
                                    overflow: 'auto',
                                    maxHeight: 120,
                                    color: 'var(--text-secondary)',
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: 9,
                                  }}
                                >
                                  {typeof step.output === 'string'
                                    ? step.output
                                    : JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processed articles */}
              {job.articles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Processed Articles
                  </h3>
                  <div
                    className="max-h-64 overflow-y-auto space-y-1.5"
                    style={{ background: 'var(--hover-bg)', borderRadius: 8, padding: 12 }}
                  >
                    {job.articles.map((article, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-lg text-xs"
                        style={{
                          background: 'var(--card-bg)',
                          borderLeft: `3px solid ${getStatusColor(article.status)}`,
                        }}
                      >
                        <span
                          style={{
                            color: getStatusColor(article.status),
                            fontWeight: 600,
                            minWidth: 45,
                            flexShrink: 0,
                          }}
                        >
                          {getStatusLabel(article.status)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {article.title || 'Untitled'}
                          </p>
                          <p style={{ color: 'var(--text-tertiary)', marginTop: 2, wordBreak: 'break-all' }}>
                            {article.sourceUrl}
                          </p>
                          {article.error && (
                            <p style={{ color: '#C1272D', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>
                              Error: {article.error}
                            </p>
                          )}
                        </div>
                        {article.articleId && (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: 9, flexShrink: 0 }}>
                            ID: {article.articleId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timing */}
              {job.startedAt && (
                <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--hover-bg)' }}>
                  <p style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>TIMING</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Started:</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {new Date(job.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {job.completedAt && (
                      <>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-secondary)' }}>Completed:</span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {new Date(job.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-secondary)' }}>Duration:</span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {formatDuration(
                              new Date(job.completedAt).getTime() -
                              new Date(job.startedAt).getTime()
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {job.error && (
                <div className="p-3 rounded-lg text-sm" style={{ background: '#FBEAF0', color: '#993556' }}>
                  <strong>Error:</strong> {job.error}
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!job && !loading && !isRunning && (
            <div className="text-center py-6">
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                Start the news pipeline to automatically crawl Yahoo News, generate articles
                using AI, and save them to your database.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: '#FBEAF0', color: '#993556' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* ── Action buttons ─────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <button
              onClick={handleStartPipeline}
              disabled={loading || isRunning}
              className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm"
              style={{
                background: loading || isRunning ? 'var(--hover-bg)' : 'var(--text-primary)',
                color:      loading || isRunning ? 'var(--text-tertiary)' : 'var(--bg-primary)',
                cursor:     loading || isRunning ? 'not-allowed' : 'pointer',
                opacity:    loading || isRunning ? 0.6 : 1,
              }}
            >
              {loading ? 'Starting…' : isRunning ? 'Running…' : 'Start Pipeline'}
            </button>
            {(job || error) && (
              <button
                onClick={handleReset}
                disabled={isRunning}
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: isRunning ? 'var(--hover-bg)' : 'var(--card-bg)',
                  color:  'var(--text-primary)',
                  border: '1px solid var(--border)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  opacity: isRunning ? 0.6 : 1,
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}