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
  }>
  startedAt?: string
  completedAt?: string
}

function authHeaders() {
  return { Authorization: `Bearer ${INNGEST_SIGNING_KEY}` }
}

/**
 * Resolve Event ID → Run ID via GET /v1/events/{eventId}/runs
 * Returns null when the run hasn't been assigned yet (normal race condition
 * right after inngest.send() — caller should retry / return pending).
 */
async function fetchRunIdFromEvent(eventId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
      headers: authHeaders(),
    })
    if (!res.ok) {
      console.error(`[pipeline] /events/${eventId}/runs → ${res.status}`)
      return null
    }
    const json = await res.json()
    const runs: InngestRun[] = json.data ?? []
    return runs[0]?.run_id ?? null
  } catch (err) {
    console.error('[pipeline] fetchRunIdFromEvent error:', err)
    return null
  }
}

/** Fetch full run details — includes live step statuses and outputs. */
async function fetchInngestRun(runId: string): Promise<InngestRun | null> {
  try {
    const res = await fetch(`https://api.inngest.com/v1/runs/${runId}`, {
      headers: authHeaders(),
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
 * Extract article progress from the best available source at any point
 * during execution:
 *
 *  Priority 1 — run.output.articles[]  (run completed)
 *  Priority 2 — step.output.articles[] (aggregator step completed)
 *  Priority 3 — individual steps where each step = one article
 *               (step.output has { articleId | title | sourceUrl })
 *  Priority 4 — failed steps with no output (count as failed articles)
 *
 * This means the progress counter increments in real-time as each step
 * finishes, rather than jumping from 0/0 to N/N at the very end.
 */
function extractArticles(run: InngestRun): ArticleEntry[] {
  // ── Priority 1: completed run has final output ───────────────────────────
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

    // ── Priority 2: step returned a batch ─────────────────────────────────
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

    // ── Priority 3: step output IS one article ────────────────────────────
    if (out && (out.articleId || out.title || out.sourceUrl)) {
      articles.push({
        sourceUrl: out.sourceUrl ?? 'Unknown',
        title: out.title ?? null,
        status:
          step.status === 'Failed'    ? 'failed'
          : step.status === 'Completed' ? 'done'
          : 'pending',
        articleId: out.articleId ?? null,
        error: step.error?.message,
      })
      continue
    }

    // ── Priority 4: failed step with no useful output ─────────────────────
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

function formatSteps(steps?: InngestStep[]): PipelineJobResponse['steps'] {
  return (steps ?? []).map((s) => ({
    id: s.id ?? s.name,
    name: s.name,
    status: s.status.toLowerCase(),
    duration:
      s.started_at && s.ended_at
        ? new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
        : undefined,
    output: s.output,
    error: s.error?.message,
  }))
}

function pendingResponse(eventId: string): PipelineJobResponse {
  return {
    id: eventId,
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

    // Step 1 — resolve eventId → runId
    const runId = await fetchRunIdFromEvent(jobId)
    if (!runId) {
      // Run not assigned yet — tell frontend to keep polling
      return NextResponse.json(pendingResponse(jobId))
    }

    // Step 2 — fetch run (includes live step-level data)
    const run = await fetchInngestRun(runId)
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Step 3 — derive article progress from whatever is available right now
    const articles = extractArticles(run)
    const done    = articles.filter((a) => a.status === 'done').length
    const failed  = articles.filter((a) => a.status === 'failed').length

    const body: PipelineJobResponse = {
      id: run.run_id,
      status: mapStatus(run.status),
      createdAt: run.started_at ?? new Date().toISOString(),
      updatedAt: run.ended_at   ?? new Date().toISOString(),
      error: run.error?.message,
      progress: { total: articles.length, done, failed },
      articles,
      steps: formatSteps(run.steps),
      startedAt: run.started_at,
      completedAt: run.ended_at,
    }

    return NextResponse.json(body)
  } catch (e) {
    console.error('[pipeline] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch pipeline status' }, { status: 500 })
  }
}