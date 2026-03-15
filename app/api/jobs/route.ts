/**
 * POST /api/jobs
 *
 * Starts a new news-crawl job.
 * The job runs in the background (fire-and-forget via setImmediate).
 * Returns the job ID immediately so the client can poll for status.
 *
 * Response 201:
 *   { jobId: number, status: "pending" }
 */

import { NextResponse } from 'next/server'
import { createJob } from '@/lib/db'
import { runNewsPipeline } from '@/lib/news-pipeline'

export async function POST() {
  // 1. Create job row synchronously
  const job = createJob()

  // 2. Fire pipeline in background — DO NOT await
  //    setImmediate lets the response flush before heavy work begins
  setImmediate(() => {
    runNewsPipeline(job.id).catch(err =>
      console.error(`[jobs] unhandled pipeline error for job ${job.id}:`, err)
    )
  })

  return NextResponse.json({ jobId: job.id, status: 'pending' }, { status: 201 })
}
