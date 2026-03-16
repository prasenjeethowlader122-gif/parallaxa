'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from './ui'

interface Step {
  id: string
  name: string
  status: string
  duration?: number
  output?: any
  error?: string
  startedAt?: string
  endedAt?: string
}

interface PipelineJob {
  id: string
  runId: string | null
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

const PENDING_WARN_AFTER = 10
const POLL_INTERVAL_MS = 2000

// ── Status helpers ────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed': return '#16a34a'
    case 'failed':    return '#dc2626'
    case 'running':   return '#2563eb'
    case 'pending':
    case 'queued':    return '#d97706'
    default:          return 'var(--text-tertiary)'
  }
}

function getStatusBg(status: string) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed': return '#f0fdf4'
    case 'failed':    return '#fef2f2'
    case 'running':   return '#eff6ff'
    case 'pending':
    case 'queued':    return '#fffbeb'
    default:          return 'var(--hover-bg)'
  }
}

function getStatusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDuration(ms?: number) {
  if (!ms) return null
  if (ms < 1000)  return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTime(iso?: string) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getStepIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'done':    return '✓'
    case 'failed':  return '✕'
    case 'running': return '▶'
    default:        return '○'
  }
}

// ── Animated running dot ──────────────────────────────────────────────────────
function PulseDot({ color = '#2563eb' }: { color?: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: color,
        opacity: 0.4, animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
      }} />
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'block' }} />
    </span>
  )
}

// ── Step row ──────────────────────────────────────────────────────────────────
function StepRow({ step, index }: { step: Step; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning   = step.status.toLowerCase() === 'running'
  const isCompleted = ['completed', 'done'].includes(step.status.toLowerCase())
  const isFailed    = step.status.toLowerCase() === 'failed'
  const color       = getStatusColor(step.status)
  const bg          = getStatusBg(step.status)

  // Friendly name: strip Inngest internal prefixes like "step-" or UUIDs
  const friendlyName = step.name
    .replace(/^step-[\w-]+:\s*/i, '')   // e.g. "step-abc123: Fetch articles" → "Fetch articles"
    .replace(/^[\w]{8}-[\w-]+\s*:?\s*/, '') // UUID prefix
    || step.name

  return (
    <div style={{ position: 'relative' }}>
      {/* Connector line */}
      <div style={{
        position: 'absolute', left: 17, top: 36, bottom: -8,
        width: 2, background: 'var(--border)', zIndex: 0,
      }} />

      <div
        style={{
          position: 'relative', zIndex: 1,
          border: `1px solid ${isRunning ? color : 'var(--border)'}`,
          borderRadius: 10,
          background: isRunning ? bg : 'var(--card-bg)',
          marginBottom: 8,
          transition: 'border-color 0.3s, background 0.3s',
          boxShadow: isRunning ? `0 0 0 3px ${color}18` : undefined,
        }}
      >
        {/* Header */}
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 10, padding: '10px 12px', background: 'transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
        >
          {/* Step number / icon */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isRunning ? color : (isCompleted ? '#16a34a' : isFailed ? '#dc2626' : 'var(--hover-bg)'),
            color: (isRunning || isCompleted || isFailed) ? '#fff' : 'var(--text-tertiary)',
            fontSize: 12, fontWeight: 700,
            transition: 'background 0.3s',
          }}>
            {isRunning ? <PulseDot color="#fff" /> : getStepIcon(step.status)}
          </div>

          {/* Name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {friendlyName}
            </p>
            {step.startedAt && (
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>
                Started {formatTime(step.startedAt)}
                {step.endedAt && ` → ${formatTime(step.endedAt)}`}
              </p>
            )}
          </div>

          {/* Right meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {formatDuration(step.duration) && (
              <span style={{
                fontSize: 10, color: 'var(--text-tertiary)',
                fontFamily: "'DM Mono', monospace",
              }}>
                {formatDuration(step.duration)}
              </span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, color,
              background: bg, padding: '2px 7px', borderRadius: 99,
              border: `1px solid ${color}40`,
            }}>
              {getStatusLabel(step.status)}
            </span>
            <span style={{
              color: 'var(--text-tertiary)', fontSize: 12,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s',
            }}>›</span>
          </div>
        </button>

        {/* Expanded details */}
        {expanded && (
          <div style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 14px 12px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Full step ID */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.05em' }}>STEP ID</p>
              <code style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: "'DM Mono', monospace", wordBreak: 'break-all' }}>
                {step.id}
              </code>
            </div>

            {/* Error */}
            {step.error && (
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', marginBottom: 3, letterSpacing: '0.05em' }}>ERROR</p>
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 6, padding: '6px 10px',
                }}>
                  <p style={{ fontSize: 11, color: '#dc2626', fontFamily: "'DM Mono', monospace" }}>{step.error}</p>
                </div>
              </div>
            )}

            {/* Output */}
            {step.output !== undefined && step.output !== null && (
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.05em' }}>OUTPUT</p>
                <pre style={{
                  background: 'var(--hover-bg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px',
                  overflow: 'auto', maxHeight: 160,
                  color: 'var(--text-secondary)',
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  margin: 0,
                }}>
                  {typeof step.output === 'string'
                    ? step.output
                    : JSON.stringify(step.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function IntelligenceTab() {
  const [isRunning, setIsRunning] = useState(false)
  const [jobId, setJobId]         = useState<string | null>(null)
  const [job, setJob]             = useState<PipelineJob | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [tick, setTick]           = useState(0)
  const pendingCountRef           = useRef(0)
  const startTimeRef              = useRef<number | null>(null)

  const fetchJobStatus = useCallback(async (id: string): Promise<PipelineJob | undefined> => {
    try {
      const res = await fetch(`/api/pipeline/${id}`, { cache: 'no-store' })
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
  }, [])

  // Poll while running or pending
  useEffect(() => {
    if (!jobId || !isRunning) return

    const interval = setInterval(async () => {
      const data = await fetchJobStatus(jobId)
      if (!data) return

      if (data.status === 'pending' && data.progress.total === 0) {
        pendingCountRef.current += 1
      } else {
        pendingCountRef.current = 0
      }

      if (data.status !== 'running' && data.status !== 'pending') {
        setIsRunning(false)
      }
    }, POLL_INTERVAL_MS)

    const ticker = setInterval(() => setTick((t) => t + 1), 1000)

    return () => {
      clearInterval(interval)
      clearInterval(ticker)
    }
  }, [jobId, isRunning, fetchJobStatus])

  const handleStartPipeline = async () => {
    setLoading(true)
    setError(null)
    setJob(null)
    pendingCountRef.current = 0
    startTimeRef.current = Date.now()

    try {
      const res = await fetch('/api/pipeline', { method: 'POST' })
      if (!res.ok) {
        setError('Failed to start pipeline')
        return
      }

      const data = await res.json()
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

  const handleReset = () => {
    setJobId(null)
    setJob(null)
    setIsRunning(false)
    setError(null)
    pendingCountRef.current = 0
    startTimeRef.current = null
  }

  const elapsed = startTimeRef.current
    ? Math.floor((Date.now() - startTimeRef.current) / 1000)
    : 0

  const formatElapsed = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`

  const pending = job
    ? job.progress.total - job.progress.done - job.progress.failed
    : 0

  const progressPct = job && job.progress.total > 0
    ? Math.round((job.progress.done / job.progress.total) * 100)
    : 0

  const isResolvingRun =
    isRunning && job?.status === 'pending' &&
    job.progress.total === 0 && pendingCountRef.current > 0

  const showPendingWarning = pendingCountRef.current >= PENDING_WARN_AFTER

  const runningSteps  = job?.steps.filter((s) => s.status.toLowerCase() === 'running') ?? []
  const completedSteps = job?.steps.filter((s) => ['completed', 'done'].includes(s.status.toLowerCase())) ?? []
  const failedSteps   = job?.steps.filter((s) => s.status.toLowerCase() === 'failed') ?? []
  const pendingSteps  = job?.steps.filter((s) => ['pending', 'queued'].includes(s.status.toLowerCase())) ?? []

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <h1 className="py-6 border-b" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
        Intelligence
      </h1>

      <Card title="News Pipeline">
        <div className="p-5 flex flex-col gap-5">

          {/* ── Live run indicator ──────────────────────────────────────── */}
          {isRunning && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: '#eff6ff', color: '#2563eb',
              border: '1px solid #bfdbfe',
            }}>
              <PulseDot color="#2563eb" />
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {isResolvingRun ? 'Waiting for Inngest run to start…' : 'Pipeline running'}
              </span>
              {job?.runId && (
                <code style={{ fontSize: 10, opacity: 0.6, fontFamily: "'DM Mono', monospace" }}>
                  run: {job.runId.slice(0, 12)}…
                </code>
              )}
              {startTimeRef.current && (
                <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                  {formatElapsed(elapsed)}
                </span>
              )}
            </div>
          )}

          {showPendingWarning && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fffbeb', color: '#92400e', fontSize: 12, border: '1px solid #fde68a' }}>
              Still waiting for Inngest to assign a run. Check your{' '}
              <code>INNGEST_SIGNING_KEY</code> env var and that your function is registered at{' '}
              <code>/api/inngest</code>.
            </div>
          )}

          {/* ── Job overview ─────────────────────────────────────────────── */}
          {job && job.status !== 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Status row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--hover-bg)' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em' }}>STATUS</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {job.status === 'running' && <PulseDot color={getStatusColor(job.status)} />}
                    <p style={{ fontSize: 14, fontWeight: 700, color: getStatusColor(job.status) }}>
                      {getStatusLabel(job.status)}
                    </p>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--hover-bg)' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em' }}>ARTICLES</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {job.progress.done}/{job.progress.total}
                    {job.progress.total > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
                        ({progressPct}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {job.progress.total > 0 && (
                <div>
                  <div style={{
                    width: '100%', height: 6, borderRadius: 99,
                    background: 'var(--hover-bg)', overflow: 'hidden', display: 'flex',
                  }}>
                    <div style={{
                      height: '100%', background: '#16a34a',
                      width: `${(job.progress.done / job.progress.total) * 100}%`,
                      transition: 'width 0.5s ease',
                    }} />
                    <div style={{
                      height: '100%', background: '#dc2626',
                      width: `${(job.progress.failed / job.progress.total) * 100}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Article stat pills */}
              {job.progress.total > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Done',    val: job.progress.done,   color: '#16a34a', bg: '#f0fdf4' },
                    { label: 'Pending', val: pending,             color: '#d97706', bg: '#fffbeb' },
                    { label: 'Failed',  val: job.progress.failed, color: '#dc2626', bg: '#fef2f2' },
                  ].map(({ label, val, color, bg }) => (
                    <div key={label} style={{ padding: '10px 0', borderRadius: 10, textAlign: 'center', background: bg }}>
                      <p style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.2 }}>{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Steps timeline ──────────────────────────────────────── */}
              {job.steps.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Execution Steps
                    </h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {runningSteps.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 99, border: '1px solid #bfdbfe' }}>
                          {runningSteps.length} running
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {completedSteps.length}/{job.steps.length} done
                      </span>
                    </div>
                  </div>

                  {/* Step summary bar */}
                  <div style={{
                    display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap',
                  }}>
                    {[
                      { steps: runningSteps,   color: '#2563eb', label: 'Running' },
                      { steps: completedSteps, color: '#16a34a', label: 'Done' },
                      { steps: failedSteps,    color: '#dc2626', label: 'Failed' },
                      { steps: pendingSteps,   color: '#d97706', label: 'Queued' },
                    ].filter(g => g.steps.length > 0).map(({ steps: gs, color, label }) => (
                      <span key={label} style={{
                        fontSize: 10, fontWeight: 600, color,
                        background: getStatusBg(label),
                        padding: '2px 8px', borderRadius: 99,
                        border: `1px solid ${color}40`,
                      }}>
                        {gs.length} {label}
                      </span>
                    ))}
                  </div>

                  {/* Step rows */}
                  <div style={{ position: 'relative' }}>
                    {job.steps.map((step, idx) => (
                      <StepRow key={step.id} step={step} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Processed articles ──────────────────────────────────── */}
              {job.articles.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Processed Articles
                  </h3>
                  <div style={{
                    maxHeight: 256, overflowY: 'auto',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    background: 'var(--hover-bg)', borderRadius: 10, padding: 10,
                  }}>
                    {job.articles.map((article, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '8px 10px', borderRadius: 8,
                          background: 'var(--card-bg)',
                          borderLeft: `3px solid ${getStatusColor(article.status)}`,
                          fontSize: 12,
                        }}
                      >
                        <span style={{
                          color: getStatusColor(article.status),
                          fontWeight: 700, minWidth: 45, flexShrink: 0, fontSize: 10,
                        }}>
                          {getStatusLabel(article.status)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {article.title || 'Untitled'}
                          </p>
                          <p style={{ color: 'var(--text-tertiary)', marginTop: 2, wordBreak: 'break-all', fontSize: 10 }}>
                            {article.sourceUrl}
                          </p>
                          {article.error && (
                            <p style={{ color: '#dc2626', marginTop: 4, fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                              {article.error}
                            </p>
                          )}
                        </div>
                        {article.articleId && (
                          <code style={{ color: 'var(--text-tertiary)', fontSize: 9, flexShrink: 0, fontFamily: "'DM Mono', monospace" }}>
                            {article.articleId.slice(0, 8)}
                          </code>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Timing ─────────────────────────────────────────────── */}
              {job.startedAt && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--hover-bg)', fontSize: 12 }}>
                  <p style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 700, fontSize: 9, letterSpacing: '0.05em' }}>TIMING</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Started</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                        {new Date(job.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {job.completedAt && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
                          <span style={{ color: 'var(--text-primary)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                            {new Date(job.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
                          <span style={{ color: 'var(--text-primary)', fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
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
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, border: '1px solid #fecaca' }}>
                  <strong>Error:</strong> {job.error}
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {!job && !loading && !isRunning && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                Start the news pipeline to automatically crawl Yahoo News, generate articles
                using AI, and save them to your database.
              </p>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 13, border: '1px solid #fecaca' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* ── Action buttons ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleStartPipeline}
              disabled={loading || isRunning}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                fontWeight: 700, fontSize: 13, border: 'none',
                background: loading || isRunning ? 'var(--hover-bg)' : 'var(--text-primary)',
                color: loading || isRunning ? 'var(--text-tertiary)' : 'var(--bg-primary)',
                cursor: loading || isRunning ? 'not-allowed' : 'pointer',
                opacity: loading || isRunning ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Starting…' : isRunning ? 'Running…' : 'Start Pipeline'}
            </button>
            {(job || error) && (
              <button
                onClick={handleReset}
                disabled={isRunning}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  fontWeight: 600, fontSize: 13,
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
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