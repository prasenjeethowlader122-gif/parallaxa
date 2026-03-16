import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

// The Inngest REST API requires an API key (INNGEST_API_KEY, starts with "sk-"),
// NOT the signing key (INNGEST_SIGNING_KEY, starts with "signkey-").
// Signing keys are only used to verify webhook payloads — never for REST calls.
const INNGEST_API_KEY = process.env.INNGEST_API_KEY

export async function POST() {
  try {
    const [{ id: eventId }] = await inngest.send({
      name: 'news/pipeline.requested',
      data: {},
    })

    if (!INNGEST_API_KEY) {
      // Can't poll Inngest REST API without an API key — return eventId
      // so the client at least knows the event was sent.
      console.warn('[pipeline] INNGEST_API_KEY is not set — cannot poll for run ID')
      return NextResponse.json({ runId: null, eventId }, { status: 202 })
    }

    // Poll until the run is created (usually instant, sometimes 1-2s)
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500))

      try {
        const res = await fetch(
          `https://api.inngest.com/v1/events/${eventId}/runs`,
          {
            headers: {
              Authorization: `Bearer ${INNGEST_API_KEY}`,
            },
          }
        )

        if (res.ok) {
          const data = await res.json()
          const runId = data?.data?.[0]?.run_id
          if (runId) return NextResponse.json({ runId })
        } else {
          console.warn(`[pipeline] Inngest poll returned ${res.status}`)
        }
      } catch (pollErr) {
        console.warn('[pipeline] Poll attempt failed:', pollErr)
      }
    }

    // Fallback: event was sent but run ID not yet available
    return NextResponse.json({ runId: null, eventId }, { status: 202 })
  } catch (err) {
    console.error('[pipeline] Failed to send Inngest event:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start pipeline' },
      { status: 500 }
    )
  }
}