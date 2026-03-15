/**
 * POST /api/pipeline
 *
 * Sends the `news/pipeline.requested` event to Inngest,
 * which triggers the durable pipeline function.
 *
 * Response 200:
 * {
 *   eventId: string   ← Inngest event ID (use Inngest dashboard to track)
 * }
 */

import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

export async function POST() {
  const [{ id: eventId }] = await inngest.send({
    name: 'news/pipeline.requested',
    data: {},
  })
  
  return NextResponse.json({ eventId })
}