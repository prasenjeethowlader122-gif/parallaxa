/**
 * app/api/inngest/route.ts
 *
 * Inngest's required HTTP endpoint — handles event delivery,
 * function registration, and the dev-server SDK handshake.
 *
 * Add INNGEST_SIGNING_KEY and INNGEST_EVENT_KEY to your .env
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { newsPipelineFunction } from '@/lib/inngest/functions'
import { ptpFunction } from '@/lib/inngest/fb-post'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [newsPipelineFunction, ptpFunction],
})