/**
 * GET /api/jobs
 *
 * Returns the 20 most recent jobs (newest first).
 *
 * Response 200:
 *   { jobs: Job[] }
 */

import { NextResponse } from 'next/server'
import { listJobs } from '@/lib/db'

export async function GET() {
  const jobs = listJobs(20)
  return NextResponse.json({ jobs })
}
