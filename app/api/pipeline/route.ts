/**
 * POST /api/pipeline
 *
 * Starts a new pipeline job in the background.
 *
 * Response 200:
 * {
 *   jobId: string
 * }
 */

import { NextResponse } from 'next/server'
import { startNewsPipeline } from '@/lib/news-pipeline'

export async function POST() {
  const jobId = startNewsPipeline()
  return NextResponse.json({ jobId })
}