import { NextRequest, NextResponse } from 'next/server'

// Uses the Inngest Signing Key — required for the REST API (/v1/events and /v1/runs)
const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY

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

/**
 * Step 1 — resolve an Event ID to a Run ID.
 *
 * Per Inngest docs: GET /v1/events/{eventId}/runs returns all runs
 * triggered by that event. The response shape is { data: InngestRun[] }.
 *
 * Auth: Bearer <INNGEST_SIGNING_KEY>
 */
async function fetchRunIdFromEvent(eventId: string): Promise<string | null> {
  if (!INNGEST_SIGNING_KEY) return null

  try {
    const response = await fetch(
      `https://api.inngest.com/v1/events/${eventId}/runs`,
      {
        headers: {
          Authorization: `Bearer ${INNGEST_SIGNING_KEY}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`[pipeline] Event runs fetch returned ${response.status}`)
      return null
    }

    const json = await response.json()
    // json.data is an array of runs; take the first one
    const runs: InngestRun[] = json.data ?? []
    return runs[0]?.run_id ?? null
  } catch (err) {
    console.error('[pipeline] Error fetching runs for event:', err)
    return null
  }
}

/**
 * Step 2 — fetch the full run details once we have the Run ID.
 *
 * GET /v1/runs/{runId}
 */
async function fetchInngestRun(runId: string): Promise<InngestRun | null> {
  if (!INNGEST_SIGNING_KEY) {
    console.warn('[pipeline] INNGEST_SIGNING_KEY is not set')
    return null
  }

  try {
    const response = await fetch(`https://api.inngest.com/v1/runs/${runId}`, {
      headers: {
        Authorization: `Bearer ${INNGEST_SIGNING_KEY}`,
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

    if (!INNGEST_SIGNING_KEY) {
      return NextResponse.json(
        { error: 'INNGEST_SIGNING_KEY is not configured on the server' },
        { status: 503 }
      )
    }

    // jobId is an Event ID — resolve it to a Run ID first
    const runId = await fetchRunIdFromEvent(jobId)

    if (!runId) {
      // The run may not have been assigned yet (event just sent); return pending
      return NextResponse.json({
        id: jobId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: { total: 0, done: 0, failed: 0 },
        articles: [],
        steps: [],
      })
    }

    const inngestRun = await fetchInngestRun(runId)

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