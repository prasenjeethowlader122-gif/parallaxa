/**
 * lib/inngest/ptp-function.ts
 * Post-To-Page pipeline as an Inngest background function.
 *
 * Triggered by:  news/ptp.requested  { articleId: string, userId: string }
 *
 * Steps:
 *   1. fetch-article      — load article from DB
 *   2. generate-caption   — OpenRouter bilingual caption + hashtags + headline
 *                           (falls back to description snippet if AI fails)
 *   3. upload-to-facebook — POST multipart photo to Graph API (OG image with headline)
 *   4. add-first-comment  — post article URL as first comment
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

const HF_MODEL = process.env.HF_MODEL ?? 'Qwen/Qwen3-8B'

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '')

const hf = new OpenAI({
  baseURL: 'https://api.bytez.com/models/v2/openai/v1',
  apiKey: process.env.HF_API_KEY ?? '8e5d3c99666ab5c262a21bb68f9fb626',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaptionResult {
  english: string
  bangla: string
  hashtags: string[]
  /** Short punchy Bangla headline for the OG image (max ~12 words) */
  imageHeadline: string
}

type Step = GetFunctionInput<typeof inngest>['step']

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ─── Fallback caption (no AI) ─────────────────────────────────────────────────

function buildFallbackCaption(article: {
  title: string
  description: string
  category: string
}): CaptionResult {
  // Take first ~300 chars of description as the caption body
  const snippet =
    article.description.length > 300
      ? article.description.slice(0, 300).trimEnd() + '…'
      : article.description

  return {
    english: `${snippet}\n\nবিস্তারিত কমেন্টে 👇 / Details in the comment below 👇`,
    bangla: `${snippet}\n\nবিস্তারিত কমেন্টে দেখুন 👇`,
    hashtags: [article.category, 'News', 'BreakingNews', 'বাংলাদেশ', 'সংবাদ'],
    imageHeadline: article.title,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateCaption(article: {
  title: string
  description: string
  category: string
  content: string
}): Promise<CaptionResult> {
  const SYSTEM = `You are a social media manager for a Bengali/English bilingual news page.
Given a news article, produce:
1. A Facebook post caption in BOTH English and Bangla
2. 5–7 hashtags
3. A short punchy Bangla headline for an image overlay (max 12 words, Bengali Unicode script)

Respond ONLY with a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "english":       "<2-3 sentence punchy English caption>",
  "bangla":        "<2-3 sentence Bangla caption in Bengali Unicode script — NOT transliteration>",
  "hashtags":      ["tag1","tag2","tag3","tag4","tag5"],
  "imageHeadline": "<max 12-word Bangla headline in Bengali Unicode script for image overlay>"
}

Rules:
- Bangla fields must use proper Bengali script (বাংলা), never Romanised Bangla
- imageHeadline must be short, bold, news-ticker style — perfect for display on a photo
- Hashtags: 3-4 English + 2-3 Bangla script tags, no # prefix in the JSON values
- Both captions feel natural for a Facebook news page, not robotic
- Do NOT include the article URL in the caption`

  const res = await hf.chat.completions.create({
    model: HF_MODEL,
    stream: false,
    max_tokens: 800,
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
    // JSON parse failed — treat as AI error and use fallback
    return buildFallbackCaption(article)
  }
}

interface FacebookUploadResult {
  /** The photo object ID — used for saving to DB */
  photoId: string
  /** The post ID — used for adding comments. May equal photoId if post_id absent. */
  postId: string
}

async function uploadPhotoToFacebook(params: {
  slug: string
  caption: string
  imageHeadline: string
}): Promise<FacebookUploadResult> {
  const endpoint = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/photos`

  const encodedHeadline = encodeURIComponent(params.imageHeadline)
  const imageUrl = `${SITE_URL}/api/og/ptp/${params.slug}?slug=${params.slug}&headline=${encodedHeadline}`

  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append('published', 'true')
  form.append('caption', params.caption)
  form.append('url', imageUrl)

  const res = await fetch(endpoint, { method: 'POST', body: form })
  const data = (await res.json()) as {
    id?: string
    post_id?: string
    error?: { message: string; code?: number; error_subcode?: number }
  }

  if (!res.ok || data.error) {
    const { message, code, error_subcode } = data.error ?? {}
    if (code === 200 || code === 10) {
      throw new Error(
        `Facebook permission error (${code}/${error_subcode}): ${message}. ` +
          `Ensure FB_ACCESS_TOKEN is a PAGE ACCESS TOKEN with "pages_manage_posts" granted.`
      )
    }
    if (code === 190) {
      throw new Error(
        `Facebook token expired (${code}): ${message}. ` +
          `Refresh your Page Access Token at https://developers.facebook.com/tools/explorer/`
      )
    }
    throw new Error(
      `Facebook photo upload failed (HTTP ${res.status}): ${message ?? JSON.stringify(data)}`
    )
  }

  const photoId = data.id
  if (!photoId) throw new Error('Facebook returned no photo ID')

  // post_id format: "{PAGE_ID}_{PHOTO_ID}" — this is what comments endpoint needs.
  // If Facebook didn't return it, construct it manually.
  const postId = data.post_id ?? `${FB_PAGE_ID}_${photoId}`

  return { photoId, postId }
}

async function addFirstComment(postId: string, articleUrl: string): Promise<void> {
  // Use the same API version as photo upload
  const endpoint = `https://graph.facebook.com/v21.0/${postId}/comments`
  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append(
    'message',
    `🔗 পুরো খবর পড়ুন / Read the full article:\n${articleUrl}`
  )

  try {
    const res = await fetch(endpoint, { method: 'POST', body: form })
    const data = (await res.json()) as { id?: string; error?: { message: string; code?: number } }
    if (!res.ok || data.error) {
      console.error(
        `[ptp-fn] first comment failed (HTTP ${res.status}): `,
        data.error?.message ?? JSON.stringify(data)
      )
    } else {
      console.info(`[ptp-fn] comment posted — id: ${data.id}`)
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

    // ── Step 2: Generate bilingual caption + image headline ───────────────
    //    If the AI call throws for any reason, fall back to a plain
    //    description-snippet caption so the post still goes out.
    const caption = await step.run('generate-caption', async () => {
      logger.info('[ptp] generating bilingual caption + image headline…')
      try {
        return await generateCaption({
          title: article.title ?? '',
          description: article.description ?? '',
          category: article.category ?? 'News',
          content: article.content ?? '',
        })
      } catch (aiErr) {
        logger.warn(
          `[ptp] AI caption failed (${errMsg(aiErr)}), using fallback description caption.`
        )
        return buildFallbackCaption({
          title: article.title ?? '',
          description: article.description ?? '',
          category: article.category ?? 'News',
        })
      }
    })

    logger.info(`[ptp] imageHeadline: "${caption.imageHeadline}"`)

    // ── Step 3: Upload photo to Facebook (with headline baked into OG URL) ─
    const { photoId, postId } = await step.run('upload-to-facebook', async () => {
      const hashtagLine = caption.hashtags.map((t) => `#${t}`).join('  ')
      const postText = [
        caption.english,
        '\n',
        caption.bangla
      ].join('\n')

      logger.info('[ptp] uploading photo to Facebook page…')
      const result = await uploadPhotoToFacebook({
        slug: article.slug,
        caption: postText,
        imageHeadline: caption.imageHeadline,
      })

      await updateArticle(articleId, {
        ptpLinks: JSON.stringify([result.postId]),
      })

      logger.info(`[ptp] ✓ photo posted — photoId: ${result.photoId}  postId: ${result.postId}`)
      return result
    })

    // ── Step 4: Add article link as first comment ─────────────────────────
    await step.run('add-first-comment', async () => {
      await addFirstComment(postId, articleUrl)
      logger.info('[ptp] ✓ first comment added')
    })

    return {
      success: true,
      photoId,
      postId,
      articleUrl,
      caption,
    }
  }
)