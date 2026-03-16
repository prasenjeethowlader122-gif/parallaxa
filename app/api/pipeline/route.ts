import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

const INNGEST_API_KEY = process.env.INNGEST_API_KEY



export async function POST() {
  try {
    const result = await inngest.send({
      name: 'news/pipeline.requested',
      data: {},
    })
    const eventId = result?.ids?.[0] ?? result?.id ?? null

    // Wait up to 10s for Inngest to assign a runId
    

    return NextResponse.json({ eventId }, { status: 202 })
  } catch (err) {
    console.error('[pipeline] Failed to send Inngest event:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}