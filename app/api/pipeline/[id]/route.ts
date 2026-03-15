/**
 * GET /api/pipeline/[id]
 *
 * Returns live job status + per-article progress.
 *
 * Response 200:
 * {
 *   job: PipelineJob,
 *   counts: { total, done, failed, pending }
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getJob } from '@/lib/news-pipeline'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = getJob(params.id)

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const counts = {
    total:   job.articles.length,
    done:    job.articles.filter(a => a.status === 'done').length,
    failed:  job.articles.filter(a => a.status === 'failed').length,
    pending: job.articles.filter(a => a.status === 'pending').length,
  }

  return NextResponse.json({ job, counts })
}