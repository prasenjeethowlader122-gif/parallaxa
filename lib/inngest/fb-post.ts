/**
 * lib/inngest/ptp-function.ts
 * Post-To-Page pipeline as an Inngest background function.
 *
 * Triggered by:  news/ptp.requested  { articleId: string, userId: string }
 *
 * Steps:
 *   1. fetch-article      — load article from DB
 *   2. render-og-image    — self-fetch /api/og/[slug] → raw PNG bytes (base64)
 *   3. generate-caption   — HuggingFace bilingual caption + hashtags
 *   4. upload-to-facebook — POST multipart photo to Graph API
 *   5. add-first-comment  — post article URL as first comment
 */

import { inngest } from './client'
import { OpenAI } from 'openai'
import { getArticleById, updateArticle } from '@/lib/db/articles'

import type { GetFunctionInput } from 'inngest'

// ─── Config ───────────────────────────────────────────────────────────────────

const FB_ACCESS_TOKEN =
  process.env.FB_ACCESS_TOKEN ??
  'EAA8ZCWezHogUBQZCwmNXg8CwByR4pKE5btgh1ZCGjCqhEdD44YkRkKgxs4GoveZBEpRempeOSB3UNpxBMiUPVu8HnuwrmsgEGIuHu9GuCRLy0uNM1SVN0xlS6sXTfJJCdcrRskOy2JSXcBw2yn0Rm2DBNaXiqrkv36CSzDo9DYMMhARKOR5l5GIkFE2yzk8cNXfDFSDvYsjZCB5pDpBCrQZA6H'

const FB_PAGE_ID = process.env.FB_PAGE_ID ?? '1009389568918602'

const HF_MODEL = process.env.HF_MODEL ?? 'nvidia/nemotron-3-super-120b-a12b:free'

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '')

const hf = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.HF_API_KEY ?? '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',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaptionResult {
  english: string
  bangla: string
  hashtags: string[]
}

type Step = GetFunctionInput < typeof inngest > ['step']

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ─── Helpers (plain fetch — safe inside step.run) ─────────────────────────────

async function generateCaption(article: {
  title: string
  description: string
  category: string
  content: string
}): Promise < CaptionResult > {
  const SYSTEM = `You are a social media manager for a Bengali/English bilingual news page.
Given a news article, write a Facebook post caption in BOTH English and Bangla, plus 5-7 hashtags.

Respond ONLY with a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "english":  "<2-3 sentence punchy English caption that hooks the reader>",
  "bangla":   "<2-3 sentence Bangla caption in real Bengali Unicode script — NOT transliteration>",
  "hashtags": ["tag1","tag2","tag3","tag4","tag5"]
}

Rules:
- Bangla must use proper Bengali script (বাংলা), never Romanised Bangla
- Hashtags: 3-4 English + 2-3 Bangla script tags, no # prefix in the JSON values
- Both captions should feel natural for a Facebook news page, not robotic
- Do NOT include the article URL in the caption — it goes in the first comment`
  
  const res = await hf.chat.completions.create({
    model: HF_MODEL,
    stream: false,
    max_tokens: 700,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          `Title:    ${article.title}`,
          `Category: ${article.category}`,
          `Summary:  ${article.description}`,
          ``,
          `Content (first 800 chars):`,
          article.content.slice(0, 800),
        ].join('\n'),
      },
    ],
  })
  
  const raw = res.choices[0]?.message?.content ?? ''
  const clean = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  
  try {
    return JSON.parse(clean) as CaptionResult
  } catch {
    console.warn('[ptp-fn] caption JSON parse failed. Raw:', raw.slice(0, 200))
    return {
      english: article.title,
      bangla: article.title,
      hashtags: [article.category, 'News', 'BreakingNews', 'বাংলাদেশ'],
    }
  }
}

async function uploadPhotoToFacebook(params: {
  slug: string
  caption: string
}): Promise < string > {
  const endpoint = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/photos`
  
  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append('published', 'true')
  form.append('caption', params.caption)
  // FIX: Use params.slug instead of the undefined bare `slug` variable,
  //      and remove the erroneous array wrapper `[slug]`
  form.append('url', `${SITE_URL}/api/og/ptp/${params.slug}`)
  
  const res = await fetch(endpoint, { method: 'POST', body: form })
  const data = (await res.json()) as {
    id ? : string
    post_id ? : string
    error ? : { message: string;code ? : number;error_subcode ? : number }
  }
  
  if (!res.ok || data.error) {
    const { message, code, error_subcode } = data.error ?? {}
    if (code === 200 || code === 10) {
      throw new Error(
        `Facebook permission error (${code}/${error_subcode}): ${message}. ` +
        `Ensure FB_ACCESS_TOKEN is a PAGE ACCESS TOKEN with "pages_manage_posts" granted. ` +
        `Re-generate at https://developers.facebook.com/tools/explorer/`
      )
    }
    if (code === 190) {
      throw new Error(
        `Facebook token expired (${code}): ${message}. ` +
        `Refresh your Page Access Token at https://developers.facebook.com/tools/explorer/`
      )
    }
    throw new Error(`Facebook photo upload failed (HTTP ${res.status}): ${message ?? JSON.stringify(data)}`)
  }
  
  const postId = data.post_id ?? data.id
  if (!postId) throw new Error('Facebook returned no post ID')
  return postId
}

async function addFirstComment(postId: string, articleUrl: string): Promise < void > {
  const endpoint = `https://graph.facebook.com/v19.0/${postId}/comments`
  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append(
    'message',
    `🔗 পুরো খবর পড়ুন / Read the full article:\n${articleUrl}`
  )
  
  try {
    const res = await fetch(endpoint, { method: 'POST', body: form })
    const data = (await res.json()) as { error ? : { message: string } }
    if (!res.ok || data.error) {
      console.error(`[ptp-fn] first comment failed: ${data.error?.message ?? JSON.stringify(data)}`)
    }
  } catch (e) {
    console.error('[ptp-fn] first comment network error:', e)
  }
}

// ─── Inngest function ─────────────────────────────────────────────────────────

export const ptpFunction = inngest.createFunction(
  {
    id: 'post-to-page-5',
    name: 'Post Article to Facebook Page',
    retries: 2,
    concurrency: { limit: 3 },
    triggers: [{ event: 'news/ptp.requested' }],
  },
  
  async ({ event, step, logger }) => {
    const { articleId } = event.data as { articleId: string }
    
    // ── Step 1: Fetch article ──────────────────────────────────────────────
    const article = await step.run('fetch-article', async () => {
      const a = await getArticleById(articleId)
      if (!a) throw new Error(`Article not found: ${articleId}`)
      return a
    })
    
    const articleUrl = `${SITE_URL}/news/${article.slug}`
    logger.info(`[ptp] processing articleId:${articleId} slug:${article.slug}`)
    
    // ── Step 3: Generate bilingual caption ────────────────────────────────
    const caption = await step.run('generate-caption', async () => {
      logger.info('[ptp] generating bilingual caption via HuggingFace…')
      return generateCaption({
        title: article.title ?? '',
        description: article.description ?? '',
        category: article.category ?? 'News',
        content: article.content ?? '',
      })
    })
    
    // ── Step 4: Upload photo to Facebook ──────────────────────────────────
    const postId = await step.run('upload-to-facebook', async () => {
      const hashtagLine = caption.hashtags.map((t) => `#${t}`).join('  ')
      const postText = [
        caption.english,
        '',
        '\n',
        '',
        caption.bangla,
        '',
        hashtagLine,
      ].join('\n')
      
      logger.info('[ptp] uploading photo to Facebook page…')
      const id = await uploadPhotoToFacebook({
        slug: article.slug,
        caption: postText,
      })
      if (id) {
        // update fi...
        await updateArticle(articleId, {
          ptpLinks : JSON.stringify([id])
        })
      }
      logger.info(`[ptp] ✓ photo posted — postId: ${id}`)
      return id
    })
    
    // ── Step 5: Add article link as first comment ─────────────────────────
    await step.run('add-first-comment', async () => {
      await addFirstComment(postId, articleUrl)
      logger.info('[ptp] ✓ first comment added')
    })
    
    return {
      success: true,
      postId,
      articleUrl,
      caption,
    }
  }
)