/**
 * app/api/ptp/route.ts
 *
 * Fires a `news/ptp.requested` Inngest event and immediately returns
 * the eventId so the client can poll for status.
 *
 * All heavy lifting (OG render, HuggingFace caption, FB upload) happens
 * inside the `ptpFunction` Inngest background job.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { inngest } from '@/lib/inngest/client'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let articleId: string
  try {
    const body = (await req.json()) as { articleId?: string }
    if (!body.articleId) throw new Error('missing')
    articleId = body.articleId
  } catch {
    return NextResponse.json(
      { error: 'articleId is required in request body' },
      { status: 400 }
    )
  }

  try {
    const result = await inngest.send({
      name: 'news/ptp.requested',
      data: { articleId, userId: session.user.id },
    })

    const eventId = result?.ids?.[0] ?? result?.id ?? null

    if (!eventId) {
      return NextResponse.json(
        { error: 'Inngest did not return an event ID — check INNGEST_EVENT_KEY' },
        { status: 500 }
      )
    }

    // 202 Accepted — job is queued, client can poll /api/pipeline/[eventId]
    return NextResponse.json({ eventId }, { status: 202 })
  } catch (err) {
    console.error('[ptp] Failed to send Inngest event:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start PTP job' },
      { status: 500 }
    )
  }
}