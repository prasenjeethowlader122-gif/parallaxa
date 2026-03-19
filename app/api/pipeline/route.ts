import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { inngest } from '@/lib/inngest/client'

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await inngest.send({
      name: 'news/pipeline.requested',
      data: {},
    })

    const eventId = result?.ids?.[0] ?? result?.id ?? null

    if (!eventId) {
      return NextResponse.json(
        { error: 'Inngest did not return an event ID — check INNGEST_EVENT_KEY' },
        { status: 500 }
      )
    }

    return NextResponse.json({ eventId }, { status: 202 })
  } catch (err) {
    console.error('[pipeline] Failed to send Inngest event:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}