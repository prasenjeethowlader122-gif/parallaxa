/**
 * lib/inngest.ts — DELETE THIS FILE
 *
 * This file was the source of multiple bugs:
 *
 *   1. It imported `inngest` from '@/lib/inngest' — a circular self-import
 *      that crashes at module load time.
 *
 *   2. It re-implemented everything already in lib/inngest/functions.ts,
 *      causing two competing versions of the pipeline to exist.
 *
 *   3. It used hardcoded API keys as fallback values.
 *
 * The correct files are:
 *   - lib/inngest/client.ts    — Inngest client singleton
 *   - lib/inngest/functions.ts — pipeline function (fixed)
 *   - lib/news-pipeline.ts     — standalone in-process pipeline (fixed)
 *
 * Update any imports that referenced this file:
 *   import { inngest } from '@/lib/inngest'
 *   →  import { inngest } from '@/lib/inngest/client'
 *
 *   import { newsPipelineFunction } from '@/lib/inngest'
 *   →  import { newsPipelineFunction } from '@/lib/inngest/functions'
 */

export { inngest } from './inngest/client'
export { newsPipelineFunction } from './inngest/functions'
