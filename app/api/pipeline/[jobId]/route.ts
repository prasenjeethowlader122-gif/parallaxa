/**
 * app/api/pipeline/[jobId]/route.ts
 *
 * Fetches detailed run information from Inngest including all steps and their outputs.
 *
 * Uses the Inngest REST API to get:
 * - Run status (pending, running, completed, failed)
 * - Step-level execution details
 * - Full output and error information
 */

import { NextRequest, NextResponse } from 'next/server'

interface InngestStep {
  id: string
  name: string
  status: 'Pending' | 'Running' | 'Completed' | 'Failed'
  started_at?: string
  ended_at?: string
  output?: any
  error?: {
    name: string
    message: string
    stack?: string
  }
  attempt?: number
  retries?: number
}

interface InngestRun {
  run_id: string
  status: 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'
  started_at?: string
  ended_at?: string
  output?: any
  error?: {
    name: string
    message: string
    stack?: string
  }
  steps?: InngestStep[]
}

interface PipelineJobResponse {
  id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string
  updatedAt: string
  error?: string
  progress: {
    total: number
    done: number
    failed: number
  }
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
  try {
    const response = await fetch(`https://api.inngest.com/v1/runs/${runId}`, {
      headers: {
        Authorization: `Bearer ${process.env.INNGEST_SIGNING_KEY}`,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch Inngest run: ${response.status}`)
      return null
    }

    const data = await response.json()
    return data.data || data
  } catch (err) {
    console.error('Error fetching Inngest run:', err)
    return null
  }
}

// Map Inngest status to our internal status
function mapInngestStatus(
  inngestStatus: string
): 'pending' | 'running' | 'done' | 'failed' {
  const lower = inngestStatus.toLowerCase()
  if (lower === 'queued' || lower === 'pending') return 'pending'
  if (lower === 'running') return 'running'
  if (lower === 'completed') return 'done'
  if (lower === 'failed' || lower === 'cancelled') return 'failed'
  return 'pending'
}

// Extract article data from function output
function extractArticlesFromOutput(
  output: any
): PipelineJobResponse['articles'] {
  if (!output || !Array.isArray(output.articles)) {
    return []
  }

  return output.articles.map((article: any) => ({
    sourceUrl: article.sourceUrl || 'Unknown',
    title: article.title || null,
    status: article.error ? 'failed' : 'done',
    articleId: article.articleId || null,
    error: article.error,
  }))
}

// Format step information for display
function formatSteps(steps?: InngestStep[]): PipelineJobResponse['steps'] {
  if (!steps || !Array.isArray(steps)) {
    return []
  }

  return steps.map((step) => {
    const duration = step.started_at && step.ended_at
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

    // Fetch the run from Inngest
    const inngestRun = await fetchInngestRun(jobId)

    if (!inngestRun) {
      return NextResponse.json(
        { error: 'Run not found' },
        { status: 404 }
      )
    }

    // Extract articles from output
    const articles = extractArticlesFromOutput(inngestRun.output)

    // Calculate progress
    const totalArticles = articles.length
    const doneArticles = articles.filter((a) => a.status === 'done').length
    const failedArticles = articles.filter((a) => a.status === 'failed').length

    // Format response
    const response: PipelineJobResponse = {
      id: inngestRun.run_id,
      status: mapInngestStatus(inngestRun.status),
      createdAt: inngestRun.started_at || new Date().toISOString(),
      updatedAt: inngestRun.ended_at || new Date().toISOString(),
      error: inngestRun.error?.message,
      progress: {
        total: totalArticles,
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
    console.error('Error in pipeline GET:', e)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline status' },
      { status: 500 }
    )
  }
}