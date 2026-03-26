/**
 * lib/inngest/fb-post.ts
 * Post-To-Page pipeline as an Inngest background function.
 *
 * Triggered by:  news/ptp.requested  { articleId: string, userId: string, ptpConfig?: PtpConfig }
 *
 * Steps:
 *   1. fetch-article      — load article from DB
 *   2. generate-caption   — Gemini bilingual caption + hashtags + headline
 *   3. upload-to-facebook — POST photo OR video to Graph API
 *
 * Video URL resolution (useVideo: true):
 *   1. ptpConfig.videoUrl supplied  → use it directly as the FB file_url
 *   2. ptpConfig.videoUrl omitted   → build render-server URL: /og/ptp/video/{slug}?...
 *   3. Video upload fails (non-perm) → fall back to photo upload automatically
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
const HF_MODEL = process.env.HF_MODEL ?? 'gemini-3.1-flash-lite-preview'
const RENDER_BASE = 'https://parallaxa-py-1.onrender.com'
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '')

const hf = new OpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: process.env.HF_API_KEY ?? 'AIzaSyAnHOLs04HOjqSspve3xKKc0GVUUVuiZMk',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface PtpConfig {
  useVideo?: boolean
  /**
   * Optional direct MP4/video URL to post to Facebook.
   * When provided and useVideo is true, this is sent straight to the Graph API
   * as `file_url` — no render-server call is made.
   * When omitted the render server's /og/ptp/video/{slug} endpoint is used.
   */
  videoUrl?: string
}

interface CaptionResult {
  english: string
  bangla: string
  hashtags: string[]
  imageHeadline: string
}

interface FacebookUploadResult {
  photoId?: string
  videoId?: string
  postId: string
  uploadType: 'photo' | 'video'
}

type Step = GetFunctionInput<typeof inngest>['step']

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ─── Caption helpers ──────────────────────────────────────────────────────────

function buildFallbackCaption(article: {
  title: string
  description: string
  category: string
}): CaptionResult {
  const snippet =
    article.description.length > 300
      ? article.description.slice(0, 300).trimEnd() + '…'
      : article.description
  return {
    english: snippet,
    bangla: snippet,
    hashtags: [article.category, 'News', 'BreakingNews', 'বাংলাদেশ', 'সংবাদ'],
    imageHeadline: article.title,
  }
}

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
3. A short punchy Bangla headline for an image overlay

Respond ONLY with a valid JSON object — no markdown fences, no preamble, no trailing text:
{
  "english":       "<2-3 sentence punchy English caption>",
  "bangla":        "<2-3 sentence Bangla caption in Bengali Unicode script — NOT transliteration>",
  "hashtags":      ["tag1","tag2","tag3","tag4","tag5"],
  "imageHeadline": "<max 12-word Bangla headline for image overlay>"
}

Rules:
- Bangla fields must use proper Bengali script (বাংলা), never Romanised Bangla
- imageHeadline must be short, bold, news-ticker style — perfect for display on a photo
- Hashtags: 3-4 English + 2-3 Bangla script tags, no # prefix in the JSON values
- Both captions feel natural for a Facebook news page, not robotic
- Do NOT include the article URL in the caption — it will be appended separately`

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
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(clean) as CaptionResult
  } catch {
    console.warn('[ptp-fn] caption JSON parse failed. Raw:', raw.slice(0, 200))
    return buildFallbackCaption(article)
  }
}

// ─── Render URL builders ──────────────────────────────────────────────────────

interface RenderParams {
  slug: string
  imageHeadline: string
  category: string
  date: string
  imageUrl: string
  wordCount: number
}

function buildPhotoRenderUrl(p: RenderParams): string {
  return (
    `${RENDER_BASE}/og/ptp/${p.slug}` +
    `?headline=${encodeURIComponent(p.imageHeadline)}` +
    `&category=${encodeURIComponent(p.category)}` +
    `&date=${encodeURIComponent(p.date)}` +
    `&image_url=${encodeURIComponent(p.imageUrl)}` +
    `&word_count=${p.wordCount}`
  )
}

function buildVideoRenderUrl(p: RenderParams): string {
  return (
    `${RENDER_BASE}/og/ptp/video/${p.slug}` +
    `?headline=${encodeURIComponent(p.imageHeadline)}` +
    `&category=${encodeURIComponent(p.category)}` +
    `&date=${encodeURIComponent(p.date)}` +
    `&image_url=${encodeURIComponent(p.imageUrl)}` +
    `&word_count=${p.wordCount}`
  )
}

// ─── Facebook upload helpers ──────────────────────────────────────────────────

function throwFbError(res: Response, data: { error?: { message: string; code?: number; error_subcode?: number } }, label: string): never {
  const { message, code, error_subcode } = data.error ?? {}
  if (code === 200 || code === 10)
    throw new Error(
      `Facebook permission error (${code}/${error_subcode}): ${message}. ` +
        `Ensure FB_ACCESS_TOKEN has "pages_manage_posts"${label === 'video' ? ' + "publish_video"' : ''} granted.`,
    )
  if (code === 190)
    throw new Error(
      `Facebook token expired (${code}): ${message}. ` +
        `Refresh at https://developers.facebook.com/tools/explorer/`,
    )
  throw new Error(
    `Facebook ${label} upload failed (HTTP ${res.status}): ${message ?? JSON.stringify(data)}`,
  )
}

async function uploadPhotoToFacebook(params: {
  renderUrl: string
  caption: string
}): Promise<{ photoId: string; postId: string }> {
  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append('published', 'true')
  form.append('caption', params.caption)
  form.append('url', params.renderUrl)

  const res = await fetch(`https://graph.facebook.com/v21.0/${FB_PAGE_ID}/photos`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json() as { id?: string; post_id?: string; error?: { message: string; code?: number; error_subcode?: number } }
  if (!res.ok || data.error) throwFbError(res, data, 'photo')

  const photoId = data.id!
  return { photoId, postId: data.post_id ?? `${FB_PAGE_ID}_${photoId}` }
}

async function uploadVideoToFacebook(params: {
  videoUrl: string
  caption: string
  title: string
}): Promise<{ videoId: string; postId: string }> {
  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append('published', 'true')
  form.append('description', params.caption)   // Graph API uses "description" for video post text
  form.append('title', params.title.slice(0, 255))
  form.append('file_url', params.videoUrl)      // FB fetches the MP4 directly from this URL

  const res = await fetch(`https://graph.facebook.com/v21.0/${FB_PAGE_ID}/videos`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json() as { id?: string; post_id?: string; error?: { message: string; code?: number; error_subcode?: number } }
  if (!res.ok || data.error) throwFbError(res, data, 'video')

  const videoId = data.id!
  return { videoId, postId: data.post_id ?? `${FB_PAGE_ID}_${videoId}` }
}

// ─── Unified upload router ────────────────────────────────────────────────────

async function uploadToFacebook(params: {
  renderParams: RenderParams
  caption: string
  title: string
  useVideo: boolean
  /** Direct video URL from the client — skips the render server entirely */
  manualVideoUrl?: string
}): Promise<FacebookUploadResult> {
  if (params.useVideo) {
    // Priority 1: caller supplied a direct video URL — use it as-is
    // Priority 2: build the render-server video URL
    const videoUrl = params.manualVideoUrl ?? buildVideoRenderUrl(params.renderParams)
    console.info(`[ptp] video upload → ${videoUrl} (${params.manualVideoUrl ? 'manual' : 'rendered'})`)

    try {
      const { videoId, postId } = await uploadVideoToFacebook({
        videoUrl,
        caption: params.caption,
        title: params.title,
      })
      return { videoId, postId, uploadType: 'video' }
    } catch (err) {
      const msg = errMsg(err)
      // Re-throw permission / token errors — retrying won't help
      if (msg.includes('permission error') || msg.includes('token expired') || msg.includes('publish_video')) {
        throw err
      }
      // Transient error (render server down, FB 5xx, etc.) → fall back to photo
      console.warn(`[ptp] video upload failed (${msg}), falling back to photo`)
    }
  }

  // Photo path (default or fallback)
  const renderUrl = buildPhotoRenderUrl(params.renderParams)
  console.info(`[ptp] photo upload → ${renderUrl}`)
  const { photoId, postId } = await uploadPhotoToFacebook({ renderUrl, caption: params.caption })
  return { photoId, postId, uploadType: 'photo' }
}

// ─── Post text builder ────────────────────────────────────────────────────────

function buildPostText(caption: CaptionResult, articleUrl: string): string {
  const hashtagLine = caption.hashtags.map((t) => `#${t}`).join('  ')
  return [caption.english, '', caption.bangla, '', `Read the full article:`, articleUrl, '', hashtagLine].join('\n')
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
    const { articleId, ptpConfig } = event.data as {
      articleId: string
      ptpConfig?: PtpConfig
    }

    const useVideo = ptpConfig?.useVideo === true
    const manualVideoUrl = ptpConfig?.videoUrl   // may be undefined

    logger.info(
      `[ptp] useVideo:${useVideo}  manualVideoUrl:${manualVideoUrl ?? 'none'}  articleId:${articleId}`,
    )

    // ── Step 1: Fetch article ──────────────────────────────────────────────
    const article = await step.run('fetch-article', async () => {
      const a = await getArticleById(articleId)
      if (!a) throw new Error(`Article not found: ${articleId}`)
      return a
    })

    const articleUrl = `${SITE_URL}/article/${article.slug}`
    logger.info(`[ptp] slug:${article.slug}`)

    // ── Step 2: Generate caption ───────────────────────────────────────────
    const caption = await step.run('generate-caption', async () => {
      logger.info('[ptp] generating bilingual caption…')
      try {
        return await generateCaption({
          title: article.title ?? '',
          description: article.description ?? '',
          category: article.category ?? 'News',
          content: article.content ?? '',
        })
      } catch (aiErr) {
        logger.warn(`[ptp] AI caption failed (${errMsg(aiErr)}), using fallback.`)
        return buildFallbackCaption({
          title: article.title ?? '',
          description: article.description ?? '',
          category: article.category ?? 'News',
        })
      }
    })

    logger.info(`[ptp] imageHeadline: "${caption.imageHeadline}"`)

    // ── Step 3: Upload to Facebook ─────────────────────────────────────────
    const uploadResult = await step.run('upload-to-facebook', async () => {
      const postText = buildPostText(caption, articleUrl)
      const wordCount = article.content ? article.content.split(/\s+/).length : 0
      const publishDate = article.publishedAt
        ? new Date(article.publishedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const renderParams: RenderParams = {
        slug: article.slug,
        imageHeadline: caption.imageHeadline,
        category: article.category ?? 'News',
        date: publishDate,
        imageUrl: article.ogImage ?? article.imageUrl ?? '',
        wordCount,
      }

      logger.info(`[ptp] uploading (${useVideo ? 'video' : 'photo'})…`)

      const result = await uploadToFacebook({
        renderParams,
        caption: postText,
        title: article.title ?? '',
        useVideo,
        manualVideoUrl,   // ← passed straight through; undefined = use render server
      })

      await updateArticle(articleId, {
        ptpLinks: JSON.stringify([result.postId]),
      })

      logger.info(
        `[ptp] ✓ posted (${result.uploadType})  ` +
          `${result.videoId ? `videoId:${result.videoId}` : `photoId:${result.photoId}`}  ` +
          `postId:${result.postId}`,
      )

      return result
    })

    return {
      success: true,
      uploadType: uploadResult.uploadType,
      photoId: uploadResult.photoId,
      videoId: uploadResult.videoId,
      postId: uploadResult.postId,
      articleUrl,
      caption,
    }
  },
)