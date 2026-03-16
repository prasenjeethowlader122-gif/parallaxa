import { NextRequest, NextResponse } from 'next/server'

// Must be an Inngest API key (starts with "sk-"), NOT the signing key.
const INNGEST_API_KEY = process.env.INNGEST_API_KEY

interface InngestStep {
  id: string
  name: string
  status: 'Pending' | 'Running' | 'Completed' | 'Failed'
  started_at?: string
  ended_at?: string
  output?: any
  error?: { name: string; message: string; stack?: string }
  attempt?: number
  retries?: number
}

interface InngestRun {
  run_id: string
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'
  started_at?: string
  ended_at?: string
  output?: any
  error?: { name: string; message: string; stack?: string }
  steps?: InngestStep[]
}

interface PipelineJobResponse {
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
  steps: Array<{
    id: string
    name: string
    status: string
    duration?: number
    output?: any
    error?: string
  }>
  startedAt?: string
  completedAt?: string
}

async function fetchInngestRun(runId: string): Promise<InngestRun | null> {
  if (!INNGEST_API_KEY) {
    console.warn('[pipeline] INNGEST_API_KEY is not set')
    return null
  }

  try {
    const response = await fetch(`https://api.inngest.com/v1/runs/${runId}`, {
      headers: {
        Authorization: `Bearer ${INNGEST_API_KEY}`,
      },
    })

    if (!response.ok) {
      console.error(`[pipeline] Inngest run fetch returned ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.data || data
  } catch (err) {
    console.error('[pipeline] Error fetching Inngest run:', err)
    return null
  }
}

function mapInngestStatus(status: string): 'pending' | 'running' | 'done' | 'failed' {
  const lower = status.toLowerCase()
  if (lower === 'queued' || lower === 'pending') return 'pending'
  if (lower === 'running') return 'running'
  if (lower === 'completed') return 'done'
  if (lower === 'failed' || lower === 'cancelled') return 'failed'
  return 'pending'
}

function extractArticlesFromOutput(output: any): PipelineJobResponse['articles'] {
  if (!output || !Array.isArray(output.articles)) return []
  return output.articles.map((article: any) => ({
    sourceUrl: article.sourceUrl || 'Unknown',
    title: article.title || null,
    status: article.error ? 'failed' : 'done',
    articleId: article.articleId || null,
    error: article.error,
  }))
}

function formatSteps(steps?: InngestStep[]): PipelineJobResponse['steps'] {
  if (!steps || !Array.isArray(steps)) return []
  return steps.map((step) => {
    const duration =
      step.started_at && step.ended_at
        ? new Date(step.ended_at).getTime() - new Date(step.started_at).getTime()
        : undefined
    return {
      id: step.id || step.name,
      name: step.name,
      status: step.status.toLowerCase(),
      duration,
      output: step.output,
      error: step.error?.message,
    }
  })
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!INNGEST_API_KEY) {
      return NextResponse.json(
        { error: 'INNGEST_API_KEY is not configured on the server' },
        { status: 503 }
      )
    }

    const inngestRun = await fetchInngestRun(jobId)

    if (!inngestRun) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const articles = extractArticlesFromOutput(inngestRun.output)
    const doneArticles = articles.filter((a) => a.status === 'done').length
    const failedArticles = articles.filter((a) => a.status === 'failed').length

    const response: PipelineJobResponse = {
      id: inngestRun.run_id,
      status: mapInngestStatus(inngestRun.status),
      createdAt: inngestRun.started_at || new Date().toISOString(),
      updatedAt: inngestRun.ended_at || new Date().toISOString(),
      error: inngestRun.error?.message,
      progress: {
        total: articles.length,
        done: doneArticles,
        failed: failedArticles,
      },
      articles,
      steps: formatSteps(inngestRun.steps),
      startedAt: inngestRun.started_at,
      completedAt: inngestRun.ended_at,
    }

    return NextResponse.json(response)
  } catch (e) {
    console.error('[pipeline] Error in GET handler:', e)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline status' },
      { status: 500 }
    )
  }
}