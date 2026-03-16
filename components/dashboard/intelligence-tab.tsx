'use client'

import { useState, useEffect } from 'react'
import { Icons } from './icons'
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

export function IntelligenceTab() {
  const [isRunning, setIsRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<PipelineJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  // Fetch pipeline job status
  const fetchJobStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/pipeline/${id}`)
      if (response.ok) {
        const data = await response.json()
        setJob(data)
        return data
      }
    } catch (err) {
      setError(id + ': failed')
      console.error('Failed to fetch job status:', err)
    }
  }

  // Poll for job updates when running
  useEffect(() => {
    if (!jobId || !isRunning) return

    const interval = setInterval(() => {
      fetchJobStatus(jobId).then((data) => {
        if (data?.status !== 'running' && data?.status !== 'pending') {
          setIsRunning(false)
        }
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, isRunning])

  // Start pipeline
  const handleStartPipeline = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pipeline', { method: 'POST' })

      if (!response.ok) {
        setError('Failed to start pipeline')
        return
      }

      const data = await response.json()
      // API returns { eventId: string } — the Inngest Event ID
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

  // Reset pipeline
  const handleReset = () => {
    setJobId(null)
    setJob(null)
    setIsRunning(false)
    setError(null)
    setExpandedStep(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return '#3B6D11'
      case 'failed':
        return '#C1272D'
      case 'pending':
      case 'queued':
      case 'running':
        return '#185FA5'
      default:
        return 'var(--text-tertiary)'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return '#EAF3DE'
      case 'failed':
        return '#FBEAF0'
      case 'pending':
      case 'queued':
      case 'running':
        return '#E6F1FB'
      default:
        return 'var(--hover-bg)'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getStepIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return '✓'
      case 'failed':
        return '✕'
      case 'running':
        return '▶'
      default:
        return '○'
    }
  }

  const pending = job ? job.progress.total - job.progress.done - job.progress.failed : 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="py-6 border-b" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
        Intelligence
      </h1>

      <Card title="News Pipeline">
        <div className="p-5 flex flex-col gap-5">
          {/* Status Display */}
          {job && (
            <div className="space-y-4">
              {/* Main Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--hover-bg)' }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Status
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: getStatusColor(job.status) }}
                  >
                    {getStatusLabel(job.status)}
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{ background: 'var(--hover-bg)' }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Progress
                  </p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {job.progress.done}/{job.progress.total}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden flex"
                  style={{ background: 'var(--hover-bg)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${job.progress.total > 0 ? (job.progress.done / job.progress.total) * 100 : 0}%`,
                      background: '#3B6D11',
                    }}
                  />
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${job.progress.total > 0 ? (job.progress.failed / job.progress.total) * 100 : 0}%`,
                      background: '#C1272D',
                    }}
                  />
                </div>
              </div>

              {/* Article Stats */}
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

              {/* Execution Steps */}
              {job.steps && job.steps.length > 0 && (
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
                          className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors hover:opacity-80"
                          style={{
                            background: 'var(--card-bg)',
                            border: `1px solid ${getStatusColor(step.status)}`,
                          }}
                        >
                          <span
                            style={{
                              color: getStatusColor(step.status),
                              fontWeight: 'bold',
                              minWidth: '20px',
                              textAlign: 'center',
                            }}
                          >
                            {getStepIcon(step.status)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {step.name}
                            </p>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                            {formatDuration(step.duration)}
                          </span>
                          <span
                            style={{
                              color: 'var(--text-tertiary)',
                              transform: expandedStep === step.id ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                            }}
                          >
                            ›
                          </span>
                        </button>

                        {/* Step Details */}
                        {expandedStep === step.id && (
                          <div
                            className="p-3 rounded-lg text-xs"
                            style={{ background: 'var(--card-bg)', marginLeft: 8 }}
                          >
                            <div className="space-y-2">
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
                                      maxHeight: '120px',
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles List */}
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
                            minWidth: '45px',
                            flexShrink: 0,
                          }}
                        >
                          {getStatusLabel(article.status)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                            {article.title || 'Untitled'}
                          </p>
                          <p
                            style={{
                              color: 'var(--text-tertiary)',
                              marginTop: 2,
                              wordBreak: 'break-all',
                            }}
                          >
                            {article.sourceUrl}
                          </p>
                          {article.error && (
                            <p
                              style={{
                                color: '#C1272D',
                                marginTop: 4,
                                fontFamily: "'DM Mono', monospace",
                              }}
                            >
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

              {/* Timing Information */}
              {job.startedAt && (
                <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--hover-bg)' }}>
                  <p style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>TIMING</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Started:</span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {new Date(job.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {job.completedAt && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Completed:</span>
                          <span style={{ color: 'var(--text-primary)' }}>
                            {new Date(job.completedAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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

              {/* Error message */}
              {job.error && (
                <div
                  className="p-3 rounded-lg text-sm"
                  style={{ background: '#FBEAF0', color: '#993556' }}
                >
                  <strong>Error:</strong> {job.error}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!job && !loading && (
            <div className="text-center py-6">
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
                Start the news pipeline to automatically crawl Yahoo News, generate articles
                using AI, and save them to your database.
              </p>
            </div>
          )}

          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: '#FBEAF0', color: '#993556' }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleStartPipeline}
              disabled={loading || isRunning}
              className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all duration-200"
              style={{
                background: loading || isRunning ? 'var(--hover-bg)' : 'var(--text-primary)',
                color: loading || isRunning ? 'var(--text-tertiary)' : 'var(--bg-primary)',
                cursor: loading || isRunning ? 'not-allowed' : 'pointer',
                opacity: loading || isRunning ? 0.6 : 1,
              }}
            >
              {loading ? 'Starting...' : isRunning ? 'Running...' : 'Start Pipeline'}
            </button>
            {job && (
              <button
                onClick={handleReset}
                disabled={isRunning}
                className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200"
                style={{
                  background: isRunning ? 'var(--hover-bg)' : 'var(--card-bg)',
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