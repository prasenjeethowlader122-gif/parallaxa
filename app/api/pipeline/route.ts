import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

// The Inngest REST API requires an API key (INNGEST_API_KEY, starts with "sk-"),
// NOT the signing key (INNGEST_SIGNING_KEY, starts with "signkey-").
// Signing keys are only used to verify webhook payloads — never for REST calls.
const INNGEST_API_KEY = process.env.INNGEST_API_KEY

export async function POST() {
  try {
    // ✅ AFTER
    const result = await inngest.send({
      name: 'news/pipeline.requested',
      data: {},
    })
    const eventId = result?.ids?.[0] ?? result?.id ?? null
    
   
    
    // Poll until the run is created (usually instant, sometimes 1-2s)
    
    return NextResponse.json({ runId: null, eventId }, { status: 202 })
  } catch (err) {
    console.error('[pipeline] Failed to send Inngest event:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to start pipeline' }, { status: 500 })
  }
}