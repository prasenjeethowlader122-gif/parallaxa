import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

const INNGEST_API_KEY = process.env.INNGEST_API_KEY

async function waitForRunId(eventId: string, timeoutMs = 10000): Promise<string | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
        headers: { Authorization: `Bearer ${INNGEST_API_KEY}` },
      })
      if (res.ok) {
        const data = await res.json()
        const runs = data?.data ?? data?.runs ?? []
        if (runs.length > 0) return runs[0].run_id ?? runs[0].id ?? null
      }
    } catch {
      // swallow — keep polling
    }
    await new Promise(r => setTimeout(r, 800))
  }
  return null
}

export async function POST() {
  try {
    const result = await inngest.send({
      name: 'news/pipeline.requested',
      data: {},
    })
    const eventId = result?.ids?.[0] ?? result?.id ?? null

    // Wait up to 10s for Inngest to assign a runId
    const runId = INNGEST_API_KEY && eventId
      ? await waitForRunId(eventId)
      : null

    return NextResponse.json({ runId, eventId }, { status: 202 })
  } catch (err) {
    console.error('[pipeline] Failed to send Inngest event:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}