'use client'

import { useState, useEffect } from 'react'
import { Icons } from './icons'
import { Card } from './ui'

interface Props {
  session: any
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
}

export function IntelligenceTab() {
  const [isRunning, setIsRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<PipelineJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const response = await fetch('/api/pipeline', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        const newJobId = data.id
        setJobId(newJobId)
        setIsRunning(true)
        setJob(data)
      } else {
        setError('Failed to start pipeline')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Pipeline error:', err)
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
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#3B6D11'
      case 'failed':
        return '#C1272D'
      case 'pending':
      case 'running':
        return '#185FA5'
      default:
        return 'var(--text-tertiary)'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

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
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--hover-bg)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${job.progress.total > 0 ? (job.progress.done / job.progress.total) * 100 : 0}%`,
                      background: '#3B6D11',
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: '#EAF3DE' }}
                >
                  <p className="text-xs" style={{ color: '#3B6D11' }}>
                    Done
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: '#3B6D11' }}
                  >
                    {job.progress.done}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: '#FAEEDA' }}
                >
                  <p className="text-xs" style={{ color: '#854F0B' }}>
                    Pending
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: '#854F0B' }}
                  >
                    {job.progress.total - job.progress.done - job.progress.failed}
                  </p>
                </div>
                <div
                  className="p-3 rounded-lg text-center"
                  style={{ background: '#FBEAF0' }}
                >
                  <p className="text-xs" style={{ color: '#993556' }}>
                    Failed
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: '#993556' }}
                  >
                    {job.progress.failed}
                  </p>
                </div>
              </div>

              {/* Articles List */}
              {job.articles.length > 0 && (
                <div className="space-y-2">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Articles
                  </h3>
                  <div
                    className="max-h-64 overflow-y-auto space-y-2"
                    style={{ background: 'var(--hover-bg)', borderRadius: 8, padding: 12 }}
                  >
                    {job.articles.map((article, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs"
                        style={{
                          padding: '8px',
                          background: 'var(--card-bg)',
                          borderRadius: 6,
                          borderLeft: `3px solid ${getStatusColor(article.status)}`,
                        }}
                      >
                        <span
                          style={{
                            color: getStatusColor(article.status),
                            fontWeight: 600,
                            minWidth: '50px',
                          }}
                        >
                          {getStatusLabel(article.status)}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                          {article.title || article.sourceUrl}
                        </span>
                        {article.articleId && (
                          <span
                            style={{
                              color: 'var(--text-tertiary)',
                              fontSize: 10,
                            }}
                          >
                            ID: {article.articleId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    ))}
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

          {/* Empty state or control buttons */}
          {!job && !loading && (
            <div className="text-center py-6">
              <p
                className="text-sm mb-4"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Click the button below to start the news pipeline. It will crawl Yahoo News,
                generate articles using AI, and save them to your database.
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
                background:
                  loading || isRunning ? 'var(--hover-bg)' : 'var(--text-primary)',
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