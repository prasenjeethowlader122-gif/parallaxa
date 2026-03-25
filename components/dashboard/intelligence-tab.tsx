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
const POLL_INTERVAL_MS   = 2000

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed': return '#3B6D11'
    case 'failed':    return '#A32D2D'
    case 'running':   return '#185FA5'
    case 'pending':
    case 'queued':    return '#854F0B'
    default:          return 'var(--text-tertiary)'
  }
}

function getStatusBg(status: string) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed': return '#EAF3DE'
    case 'failed':    return '#FCEBEB'
    case 'running':   return '#E6F1FB'
    case 'pending':
    case 'queued':    return '#FAEEDA'
    default:          return 'var(--hover-bg)'
  }
}

function getStatusBorder(status: string) {
  switch (status.toLowerCase()) {
    case 'done':
    case 'completed': return '#C0DD97'
    case 'failed':    return '#F7C1C1'
    case 'running':   return '#B5D4F4'
    case 'pending':
    case 'queued':    return '#FAC775'
    default:          return 'var(--border)'
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
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getStepIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'done':    return '✓'
    case 'failed':  return '✕'
    case 'running': return null  // spinner rendered separately
    default:        return null  // circle rendered separately
  }
}

// ── Animated pulse dot ────────────────────────────────────────────────────────

function PulseDot({ color = '#185FA5', size = 10 }: { color?: string; size?: number }) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: color,
          opacity: 0.4,
          animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite',
        }}
      />
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: color,
          display: 'block',
        }}
      />
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ color = 'currentColor', size = 12 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
    </svg>
  )
}

// ── Step row ──────────────────────────────────────────────────────────────────

function StepRow({ step, index, isLast }: { step: Step; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning   = step.status.toLowerCase() === 'running'
  const isCompleted = ['completed', 'done'].includes(step.status.toLowerCase())
  const isFailed    = step.status.toLowerCase() === 'failed'
  const color       = getStatusColor(step.status)
  const bg          = getStatusBg(step.status)
  const border      = getStatusBorder(step.status)

  const friendlyName = step.name
    .replace(/^step-[\w-]+:\s*/i, '')
    .replace(/^[\w]{8}-[\w-]+\s*:?\s*/, '')
    || step.name

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: isLast ? 0 : 8 }}>
      {/* Timeline track */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: isRunning
              ? bg
              : isCompleted
              ? '#EAF3DE'
              : isFailed
              ? '#FCEBEB'
              : 'var(--hover-bg)',
            border: `1.5px solid ${isRunning || isCompleted || isFailed ? border : 'var(--border)'}`,
            color,
            fontSize: 11,
            fontWeight: 700,
            transition: 'all 0.3s',
          }}
        >
          {isRunning ? (
            <Spinner color={color} size={11} />
          ) : isCompleted ? (
            <span style={{ fontSize: 11 }}>✓</span>
          ) : isFailed ? (
            <span style={{ fontSize: 11 }}>✕</span>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{index + 1}</span>
          )}
        </div>
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 1.5,
              minHeight: 16,
              background: isCompleted ? '#C0DD97' : 'var(--border)',
              marginTop: 4,
            }}
          />
        )}
      </div>

      {/* Step card */}
      <div
        style={{
          flex: 1,
          border: `0.5px solid ${isRunning ? border : 'var(--border)'}`,
          borderRadius: 12,
          background: isRunning ? `${bg}60` : 'var(--card-bg)',
          transition: 'border-color 0.3s, background 0.3s',
          marginBottom: isLast ? 0 : 4,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {friendlyName}
            </p>
            {step.startedAt && (
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {formatTime(step.startedAt)}
                {step.endedAt && ` → ${formatTime(step.endedAt)}`}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {formatDuration(step.duration) && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {formatDuration(step.duration)}
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color,
                background: bg,
                padding: '2px 8px',
                borderRadius: 99,
                border: `0.5px solid ${border}`,
              }}
            >
              {getStatusLabel(step.status)}
            </span>
            {(step.output !== undefined || step.error) && (
              <span
                style={{
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  transform: expanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                  display: 'inline-block',
                }}
              >
                ›
              </span>
            )}
          </div>
        </button>

        {expanded && (step.output !== undefined || step.error) && (
          <div
            style={{
              borderTop: '0.5px solid var(--border)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  marginBottom: 3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Step ID
              </p>
              <code
                style={{
                  fontSize: 10,
                  color: 'var(--text-secondary)',
                  fontFamily: "'DM Mono', monospace",
                  wordBreak: 'break-all',
                }}
              >
                {step.id}
              </code>
            </div>

            {step.error && (
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#A32D2D',
                    marginBottom: 4,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Error
                </p>
                <div
                  style={{
                    background: '#FCEBEB',
                    border: '0.5px solid #F7C1C1',
                    borderRadius: 8,
                    padding: '8px 12px',
                  }}
                >
                  <p style={{ fontSize: 11, color: '#A32D2D', fontFamily: "'DM Mono', monospace" }}>
                    {step.error}
                  </p>
                </div>
              </div>
            )}

            {step.output !== undefined && step.output !== null && (
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    marginBottom: 4,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Output
                </p>
                <pre
                  style={{
                    background: 'var(--hover-bg)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    overflow: 'auto',
                    maxHeight: 160,
                    color: 'var(--text-secondary)',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    margin: 0,
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
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function IntelligenceTab() {
  const [isRunning, setIsRunning] = useState(false)
  const [jobId, setJobId]         = useState<string | null>(null)
  const [job, setJob]             = useState<PipelineJob | null>(null)
  const [targetUrl , setTargetUrl] = useState('');
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
    const ticker = setInterval(() => setTick(t => t + 1), 1000)
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
    startTimeRef.current    = Date.now()
    try {
      const res = await fetch('/api/pipeline', { method: 'POST' , body : {
        tUrl : targetUrl
      }})
      if (!res.ok) {
        setError('Failed to start pipeline')
        return
      }
      const data     = await res.json()
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
    startTimeRef.current    = null
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

  const runningSteps   = job?.steps.filter(s => s.status.toLowerCase() === 'running') ?? []
  const completedSteps = job?.steps.filter(s => ['completed', 'done'].includes(s.status.toLowerCase())) ?? []
  const failedSteps    = job?.steps.filter(s => s.status.toLowerCase() === 'failed') ?? []
  const pendingSteps   = job?.steps.filter(s => ['pending', 'queued'].includes(s.status.toLowerCase())) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* Page heading */}
      <div style={{ paddingBottom: 20, borderBottom: '0.5px solid var(--border)' }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: "'Syne', sans-serif",
          }}
        >
          Intelligence
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
          Automated news pipeline and AI content generation
        </p>
      </div>

      <Card title="News pipeline">
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Live run indicator */}
          {isRunning && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '11px 14px',
                borderRadius: 12,
                background: '#E6F1FB',
                border: '0.5px solid #B5D4F4',
              }}
            >
              <PulseDot color="#185FA5" />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#185FA5' }}>
                {isResolvingRun ? 'Waiting for run to start…' : 'Pipeline running'}
              </span>
              {job?.runId && (
                <code
                  style={{
                    fontSize: 10,
                    opacity: 0.6,
                    fontFamily: "'DM Mono', monospace",
                    color: '#185FA5',
                  }}
                >
                  run: {job.runId.slice(0, 12)}…
                </code>
              )}
              {startTimeRef.current && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontFamily: "'DM Mono', monospace",
                    color: '#185FA5',
                    opacity: 0.7,
                  }}
                >
                  {formatElapsed(elapsed)}
                </span>
              )}
            </div>
          )}

          {showPendingWarning && (
            <div
              style={{
                padding: '11px 14px',
                borderRadius: 12,
                background: '#FAEEDA',
                color: '#854F0B',
                fontSize: 12,
                border: '0.5px solid #FAC775',
                lineHeight: 1.6,
              }}
            >
              Still waiting for Inngest to assign a run. Check your{' '}
              <code style={{ fontFamily: "'DM Mono', monospace" }}>INNGEST_SIGNING_KEY</code> env
              var and that your function is registered at{' '}
              <code style={{ fontFamily: "'DM Mono', monospace" }}>/api/inngest</code>.
            </div>
          )}

          {/* Job overview */}
          {job && job.status !== 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Status + articles grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div
                  style={{
                    padding: '13px 16px',
                    borderRadius: 12,
                    background: 'var(--hover-bg)',
                    border: '0.5px solid var(--border)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      marginBottom: 6,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Status
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {job.status === 'running' && <PulseDot color={getStatusColor(job.status)} />}
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: getStatusColor(job.status),
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      {getStatusLabel(job.status)}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    padding: '13px 16px',
                    borderRadius: 12,
                    background: 'var(--hover-bg)',
                    border: '0.5px solid var(--border)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      color: 'var(--text-tertiary)',
                      marginBottom: 6,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Articles
                  </p>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {job.progress.done}/{job.progress.total}
                    {job.progress.total > 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--text-tertiary)',
                          fontWeight: 400,
                          marginLeft: 6,
                        }}
                      >
                        ({progressPct}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              {job.progress.total > 0 && (
                <div
                  style={{
                    width: '100%',
                    height: 5,
                    borderRadius: 99,
                    background: 'var(--hover-bg)',
                    overflow: 'hidden',
                    display: 'flex',
                    border: '0.5px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: '#639922',
                      width: `${(job.progress.done / job.progress.total) * 100}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                  <div
                    style={{
                      height: '100%',
                      background: '#E24B4A',
                      width: `${(job.progress.failed / job.progress.total) * 100}%`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              )}

              {/* Article stat pills */}
              {job.progress.total > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Done',    val: job.progress.done,   color: '#3B6D11', bg: '#EAF3DE', border: '#C0DD97' },
                    { label: 'Pending', val: pending,              color: '#854F0B', bg: '#FAEEDA', border: '#FAC775' },
                    { label: 'Failed',  val: job.progress.failed,  color: '#A32D2D', bg: '#FCEBEB', border: '#F7C1C1' },
                  ].map(({ label, val, color, bg, border }) => (
                    <div
                      key={label}
                      style={{
                        padding: '12px 0',
                        borderRadius: 12,
                        textAlign: 'center',
                        background: bg,
                        border: `0.5px solid ${border}`,
                      }}
                    >
                      <p style={{ fontSize: 10, color, fontWeight: 600, letterSpacing: '0.04em' }}>
                        {label}
                      </p>
                      <p
                        style={{
                          fontSize: 22,
                          fontWeight: 600,
                          color,
                          lineHeight: 1.2,
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps timeline */}
              {job.steps.length > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: "'Syne', sans-serif",
                      }}
                    >
                      Execution steps
                    </h3>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {runningSteps.length > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#185FA5',
                            background: '#E6F1FB',
                            padding: '2px 8px',
                            borderRadius: 99,
                            border: '0.5px solid #B5D4F4',
                          }}
                        >
                          {runningSteps.length} running
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                        {completedSteps.length}/{job.steps.length} done
                      </span>
                    </div>
                  </div>

                  <div>
                    {job.steps.map((step, idx) => (
                      <StepRow
                        key={step.id}
                        step={step}
                        index={idx}
                        isLast={idx === job.steps.length - 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Processed articles */}
              {job.articles.length > 0 && (
                <div>
                  <h3
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: 10,
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    Processed articles
                  </h3>
                  <div
                    style={{
                      maxHeight: 280,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      background: 'var(--hover-bg)',
                      borderRadius: 12,
                      padding: 10,
                      border: '0.5px solid var(--border)',
                    }}
                  >
                    {job.articles.map((article, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '9px 12px',
                          borderRadius: 9,
                          background: 'var(--card-bg)',
                          borderLeft: `2.5px solid ${getStatusColor(article.status)}`,
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{
                            color: getStatusColor(article.status),
                            fontWeight: 600,
                            minWidth: 44,
                            flexShrink: 0,
                            fontSize: 10,
                            letterSpacing: '0.03em',
                          }}
                        >
                          {getStatusLabel(article.status)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {article.title || 'Untitled'}
                          </p>
                          <p
                            style={{
                              color: 'var(--text-tertiary)',
                              marginTop: 2,
                              wordBreak: 'break-all',
                              fontSize: 10,
                            }}
                          >
                            {article.sourceUrl}
                          </p>
                          {article.error && (
                            <p
                              style={{
                                color: '#A32D2D',
                                marginTop: 4,
                                fontFamily: "'DM Mono', monospace",
                                fontSize: 10,
                              }}
                            >
                              {article.error}
                            </p>
                          )}
                        </div>
                        {article.articleId && (
                          <code
                            style={{
                              color: 'var(--text-tertiary)',
                              fontSize: 9,
                              flexShrink: 0,
                              fontFamily: "'DM Mono', monospace",
                            }}
                          >
                            {article.articleId.slice(0, 8)}
                          </code>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timing */}
              {job.startedAt && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    background: 'var(--hover-bg)',
                    border: '0.5px solid var(--border)',
                    fontSize: 12,
                  }}
                >
                  <p
                    style={{
                      color: 'var(--text-tertiary)',
                      marginBottom: 8,
                      fontWeight: 600,
                      fontSize: 9,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Timing
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Started</span>
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11,
                        }}
                      >
                        {new Date(job.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {job.completedAt && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Completed</span>
                          <span
                            style={{
                              color: 'var(--text-primary)',
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 11,
                            }}
                          >
                            {new Date(job.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Duration</span>
                          <span
                            style={{
                              color: '#3B6D11',
                              fontFamily: "'DM Mono', monospace",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
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
                <div
                  style={{
                    padding: '11px 14px',
                    borderRadius: 12,
                    background: '#FCEBEB',
                    color: '#A32D2D',
                    fontSize: 13,
                    border: '0.5px solid #F7C1C1',
                  }}
                >
                  <strong>Error:</strong> {job.error}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!job && !loading && !isRunning && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'var(--hover-bg)',
                  border: '0.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-tertiary)',
                  marginBottom: 4,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" strokeLinecap="round"/>
                </svg>
              </div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', sans-serif",
                }}
              >
                Pipeline ready
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-tertiary)',
                  lineHeight: 1.6,
                  maxWidth: 360,
                }}
              >
                Start the news pipeline to automatically crawl Yahoo News, generate articles using AI, and save them to your database.
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '11px 14px',
                borderRadius: 12,
                background: '#FCEBEB',
                color: '#A32D2D',
                fontSize: 13,
                border: '0.5px solid #F7C1C1',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Action buttons */}
          <input type='text' value = 'https://www.dhakatribune.com/bangladesh/nation/406170/bus-plunge-at-daulatdia-two-dead-35-missing-as' onChange={((val)=>{setTargetUrl(val.target?.value || '')})}/>
          <div style={{ display: 'flex', gap: 10, paddingTop: job || error ? 4 : 0 }}>
            <button
              onClick={handleStartPipeline}
              disabled={loading || isRunning}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                border: 'none',
                fontFamily: "'Syne', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: loading || isRunning ? 'var(--hover-bg)' : 'var(--text-primary)',
                color: loading || isRunning ? 'var(--text-tertiary)' : 'var(--bg-primary)',
                cursor: loading || isRunning ? 'not-allowed' : 'pointer',
                opacity: loading || isRunning ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => {
                if (!loading && !isRunning)
                  (e.currentTarget as HTMLElement).style.opacity = '0.85'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.opacity =
                  loading || isRunning ? '0.6' : '1'
              }}
            >
              {(loading || isRunning) && <Spinner color="currentColor" size={13} />}
              {loading ? 'Starting…' : isRunning ? 'Running…' : 'Start pipeline'}
            </button>

            {(job || error) && (
              <button
                onClick={handleReset}
                disabled={isRunning}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '0.5px solid var(--border)',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  opacity: isRunning ? 0.6 : 1,
                  fontFamily: "'Syne', sans-serif",
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isRunning)
                    (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background = 'var(--card-bg)'
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