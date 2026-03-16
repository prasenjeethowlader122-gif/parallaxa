import { NextRequest, NextResponse } from 'next/server'

const INNGEST_SIGNING_KEY = process.env.INNGEST_SIGNING_KEY

interface InngestStep {
  id: string
  name: string
  status: 'Pending' | 'Running' | 'Completed' | 'Failed'
  started_at?: string
  ended_at?: string
  output?: any
  error?: { name: string; message: string; stack?: string }
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

interface ArticleEntry {
  sourceUrl: string
  title: string | null
  status: 'pending' | 'done' | 'failed'
  articleId: string | null
  error?: string
}

interface PipelineJobResponse {
  id: string
  runId: string | null
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string
  updatedAt: string
  error?: string
  progress: { total: number; done: number; failed: number }
  articles: ArticleEntry[]
  steps: Array<{
    id: string
    name: string
    status: string
    duration?: number
    output?: any
    error?: string
    startedAt?: string
    endedAt?: string
  }>
  startedAt?: string
  completedAt?: string
}

function authHeaders() {
  return { Authorization: `Bearer signkey-prod-30a52089d4ed603399def4e78018449200675cb8a3c1ce7a8a4ff7522d2b1c35` }
}

/**
 * Resolve Event ID → all runs via GET /v1/events/{eventId}/runs
 * Returns null when the run hasn't been assigned yet.
 */
async function fetchRunsFromEvent(eventId: string): Promise<InngestRun[]> {
  try {
    const res = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[pipeline] /events/${eventId}/runs → ${res.status}`)
      return []
    }
    const json = await res.json()
    return json.data ?? []
  } catch (err) {
    console.error('[pipeline] fetchRunsFromEvent error:', err)
    return []
  }
}

/** Fetch full run details including live step statuses and outputs. */
async function fetchInngestRun(runId: string): Promise<InngestRun | null> {
  try {
    const res = await fetch(`https://api.inngest.com/v1/runs/${runId}`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error(`[pipeline] /runs/${runId} → ${res.status}`)
      return null
    }
    const json = await res.json()
    return json.data ?? json
  } catch (err) {
    console.error('[pipeline] fetchInngestRun error:', err)
    return null
  }
}

/**
 * Fetch detailed step-level timeline for a run via /v1/runs/{runId}/actions
 * This endpoint returns richer step data including input/output and timing.
 */
async function fetchRunSteps(runId: string): Promise<InngestStep[]> {
  try {
    const res = await fetch(`https://api.inngest.com/v1/runs/${runId}/actions`, {
      headers: authHeaders(),
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn(`[pipeline] /runs/${runId}/actions → ${res.status}, falling back to run.steps`)
      return []
    }
    const json = await res.json()
    // The actions endpoint returns { data: Step[] }
    const actions: any[] = json.data ?? []
    return actions.map((a) => ({
      id: a.id ?? a.step_id ?? a.name,
      name: a.display_name ?? a.name ?? a.id,
      status: a.status ?? 'Pending',
      started_at: a.started_at,
      ended_at: a.ended_at,
      output: a.output ?? a.data,
      error: a.error
        ? { name: a.error.name ?? 'Error', message: a.error.message ?? String(a.error) }
        : undefined,
    }))
  } catch (err) {
    console.warn('[pipeline] fetchRunSteps error:', err)
    return []
  }
}

/**
 * Extract article progress from the best available source at any point
 * during execution.
 */
function extractArticles(run: InngestRun): ArticleEntry[] {
  // Priority 1: completed run has final output
  if (run.output?.articles && Array.isArray(run.output.articles)) {
    return run.output.articles.map((a: any) => ({
      sourceUrl: a.sourceUrl ?? 'Unknown',
      title: a.title ?? null,
      status: a.error ? 'failed' : 'done',
      articleId: a.articleId ?? null,
      error: a.error,
    }))
  }

  const articles: ArticleEntry[] = []

  for (const step of run.steps ?? []) {
    const out = step.output

    // Priority 2: step returned a batch
    if (out?.articles && Array.isArray(out.articles)) {
      out.articles.forEach((a: any) =>
        articles.push({
          sourceUrl: a.sourceUrl ?? 'Unknown',
          title: a.title ?? null,
          status: a.error ? 'failed' : 'done',
          articleId: a.articleId ?? null,
          error: a.error,
        })
      )
      continue
    }

    // Priority 3: step output IS one article
    if (out && (out.articleId || out.title || out.sourceUrl)) {
      articles.push({
        sourceUrl: out.sourceUrl ?? 'Unknown',
        title: out.title ?? null,
        status:
          step.status === 'Failed' ? 'failed'
          : step.status === 'Completed' ? 'done'
          : 'pending',
        articleId: out.articleId ?? null,
        error: step.error?.message,
      })
      continue
    }

    // Priority 4: failed step with no useful output
    if (step.status === 'Failed' && step.error) {
      articles.push({
        sourceUrl: 'Unknown',
        title: null,
        status: 'failed',
        articleId: null,
        error: step.error.message,
      })
    }
  }

  return articles
}

function mapStatus(s: string): PipelineJobResponse['status'] {
  const l = s.toLowerCase()
  if (l === 'queued' || l === 'pending') return 'pending'
  if (l === 'running') return 'running'
  if (l === 'completed') return 'done'
  return 'failed'
}

function formatSteps(steps: InngestStep[]): PipelineJobResponse['steps'] {
  return steps.map((s) => ({
    id: s.id ?? s.name,
    name: s.name,
    status: (s.status ?? 'pending').toLowerCase(),
    duration:
      s.started_at && s.ended_at
        ? new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
        : undefined,
    output: s.output,
    error: s.error?.message,
    startedAt: s.started_at,
    endedAt: s.ended_at,
  }))
}

function pendingResponse(eventId: string): PipelineJobResponse {
  return {
    id: eventId,
    runId: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: { total: 0, done: 0, failed: 0 },
    articles: [],
    steps: [],
  }
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!INNGEST_SIGNING_KEY) {
      return NextResponse.json(
        { error: 'INNGEST_SIGNING_KEY is not configured' },
        { status: 503 }
      )
    }

    // Step 1 — resolve eventId → runs (may be multiple runs for one event)
    const runs = await fetchRunsFromEvent(jobId)

    if (runs.length === 0) {
      // Run not assigned yet — tell frontend to keep polling
      return NextResponse.json(pendingResponse(jobId))
    }

    // Use the first (most recent) run
    const primaryRunSummary = runs[0]
    const runId = primaryRunSummary.run_id

    // Step 2 — fetch full run with embedded steps
    const run = await fetchInngestRun(runId)
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Step 3 — try to get richer step data from the actions endpoint
    const actionSteps = await fetchRunSteps(runId)

    // Merge: prefer actionSteps if available, fall back to run.steps
    const mergedSteps: InngestStep[] =
      actionSteps.length > 0 ? actionSteps : (run.steps ?? [])

    // Attach merged steps back onto the run object for extractArticles()
    const enrichedRun: InngestRun = { ...run, steps: mergedSteps }

    // Step 4 — derive article progress
    const articles = extractArticles(enrichedRun)
    const done = articles.filter((a) => a.status === 'done').length
    const failed = articles.filter((a) => a.status === 'failed').length

    const body: PipelineJobResponse = {
      id: jobId,
      runId,
      status: mapStatus(run.status),
      createdAt: run.started_at ?? new Date().toISOString(),
      updatedAt: run.ended_at ?? new Date().toISOString(),
      error: run.error?.message,
      progress: { total: articles.length, done, failed },
      articles,
      steps: formatSteps(mergedSteps),
      startedAt: run.started_at,
      completedAt: run.ended_at,
    }

    return NextResponse.json(body)
  } catch (e) {
    console.error('[pipeline] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch pipeline status' }, { status: 500 })
  }
}