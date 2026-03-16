import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

export async function POST() {
  const [{ id: eventId }] = await inngest.send({
    name: 'yahoo-news-pipeline',
    data: {},
  })

  // Poll Inngest until the run is created (usually instant)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500))

    const res = await fetch(`https://api.inngest.com/v1/events/${eventId}/runs`, {
      headers: {
        Authorization: `Bearer signkey-prod-30a52089d4ed603399def4e78018449200675cb8a3c1ce7a8a4ff7522d2b1c35`,
      },
    })

    if (res.ok) {
      const data = await res.json()
      const runId = data?.data?.[0]?.run_id
      if (runId) return NextResponse.json({ runId })
    }
  }

  // Fallback: return eventId so the client isn't left hanging
  return NextResponse.json({ runId: null, eventId }, { status: 202 })
}