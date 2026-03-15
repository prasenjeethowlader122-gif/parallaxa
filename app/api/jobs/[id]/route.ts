/**
 * GET /api/jobs/[id]
 *
 * Returns the job status and all articles generated so far.
 *
 * Response 200:
 * {
 *   job: { id, status, created_at, updated_at, error },
 *   articles: [
 *     { id, source_url, source_title, hero_image, title, body, status, created_at, error },
 *     ...
 *   ],
 *   counts: { total, done, failed, pending }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJob, getArticlesByJob } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = parseInt(params.id, 10)

  if (isNaN(jobId)) {
    return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 })
  }

  const job = getJob(jobId)

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const articles = getArticlesByJob(jobId)

  const counts = {
    total:   articles.length,
    done:    articles.filter(a => a.status === 'done').length,
    failed:  articles.filter(a => a.status === 'failed').length,
    pending: articles.filter(a => a.status === 'pending').length,
  }

  return NextResponse.json({ job, articles, counts })
}
