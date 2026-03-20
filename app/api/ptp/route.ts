/**
 * app/api/ptp/route.ts
 * Post To Page — takes an articleId, generates OG image + bilingual
 * caption via HuggingFace, uploads everything to Facebook as a photo post,
 * then adds the article URL as the first comment.
 *
 * Image strategy:
 *   Internally fetch /api/og/[slug] (same server) → get raw PNG bytes →
 *   upload as multipart/form-data to Graph API.
 *   This is more reliable than giving Facebook a URL to crawl because
 *   edge-rendered ImageResponse pages can time-out for FB's crawler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getArticleById } from '@/lib/db/articles'
import { OpenAI } from 'openai'

// ─── Config ───────────────────────────────────────────────────────────────────

const FB_ACCESS_TOKEN =
  process.env.FB_ACCESS_TOKEN ??
  'EAA8ZCWezHogUBQ9VKzNH7KPAyUcmdECFvrlXFH2K9UpWeI2TfOmmFZAXczNP9PUONa46CUpAwt8ELndXZBSYzn4012rrCiF5ZBJisGflJSTliT0hzD7IgZCHKIk25cTs8cV3PY3IlAJkOZCblGYDrFZBu2fa7FowlLnobBobBo7s4gNpZCoL4FZCw84rQKAgIZBrNCltAOGrmPfSPgZBxDgSFw7LMOHBfu0YZAFm1fKzn4d76gIaxolbGgb1TTOJ7jetpUDidKtv3R0NDmK6GFkpa7XfS7MFP4tmEAO629ZB8iXYZD'

const FB_PAGE_ID =
  process.env.FB_PAGE_ID ?? '61585992363291'

const HF_MODEL =
  process.env.HF_MODEL ?? 'Qwen/Qwen2.5-72B-Instruct'

/** Your public site URL — used to build article links and to self-fetch OG images */
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://v0-parallaxa.vercel.app').replace(/\/$/, '')

// ─── HuggingFace client (same setup as pipeline) ─────────────────────────────

const hf = new OpenAI({
  baseURL: 'https://router.huggingface.co/v1',
  apiKey: process.env.HF_API_KEY ?? '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',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaptionResult {
  english:  string
  bangla:   string
  hashtags: string[]
}

// ─── Step 1: Render OG image → raw bytes ─────────────────────────────────────

/**
 * Self-fetch the existing /api/og/[slug] edge route and return the raw PNG
 * buffer. We pass ?slug= as a query param because the route reads it that way.
 */
async function fetchOgImageBytes(slug: string): Promise<{ bytes: Buffer; mimeType: string }> {
  // /api/og/[slug] reads `searchParams.get('slug')` — keep both path + QS
  const url = `${SITE_URL}/api/og/${encodeURIComponent(slug)}?slug=${encodeURIComponent(slug)}`

  const res = await fetch(url, {
    headers: { 'Cache-Control': 'no-store' },
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    throw new Error(`OG image render failed: HTTP ${res.status} for ${url}`)
  }

  const contentType = res.headers.get('content-type') ?? 'image/png'
  const arrayBuffer = await res.arrayBuffer()
  return { bytes: Buffer.from(arrayBuffer), mimeType: contentType }
}

// ─── Step 2: Generate bilingual caption + hashtags ───────────────────────────

async function generateCaption(article: {
  title:       string
  description: string
  category:    string
  content:     string
}): Promise<CaptionResult> {
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
    model:       HF_MODEL,
    stream:      false,
    max_tokens:  700,
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

  const raw   = res.choices[0]?.message?.content ?? ''
  const clean = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(clean) as CaptionResult
  } catch {
    console.warn('[ptp] caption JSON parse failed, using title fallback. Raw:', raw.slice(0, 200))
    return {
      english:  article.title,
      bangla:   article.title,
      hashtags: [article.category, 'News', 'BreakingNews', 'বাংলাদেশ'],
    }
  }
}

// ─── Step 3: Upload image binary to Facebook ──────────────────────────────────

/**
 * Upload a PNG/JPEG buffer as a multipart photo to the page feed.
 * Graph API endpoint: POST /{page-id}/photos
 * Returns the post ID we can comment on.
 */
async function uploadPhotoToFacebook(params: {
  imageBytes: Buffer
  mimeType:   string
  caption:    string
}): Promise<string> {
  const endpoint = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`

  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append('published',    'true')
  form.append('caption',      params.caption)
  form.append(
    'source',
    new Blob([params.imageBytes], { type: params.mimeType }),
    'og-image.png',
  )

  const res  = await fetch(endpoint, { method: 'POST', body: form })
  const data = await res.json() as {
    id?: string
    post_id?: string
    error?: { message: string }
  }

  if (!res.ok || data.error) {
    throw new Error(
      `Facebook photo upload failed (HTTP ${res.status}): ${data.error?.message ?? JSON.stringify(data)}`
    )
  }

  // /photos returns { id: "<photo_id>", post_id: "<page_post_id>" }
  // post_id is needed for the /comments endpoint
  const postId = data.post_id ?? data.id
  if (!postId) throw new Error('Facebook returned no post ID')
  return postId
}

// ─── Step 4: Add article link as first comment ────────────────────────────────

/**
 * Post a comment on the newly created photo post.
 * Non-fatal — logs on failure but never throws.
 */
async function addFirstComment(postId: string, articleUrl: string): Promise<void> {
  const endpoint = `https://graph.facebook.com/v19.0/${postId}/comments`

  const form = new FormData()
  form.append('access_token', FB_ACCESS_TOKEN)
  form.append(
    'message',
    `🔗 পুরো খবর পড়ুন / Read the full article:\n${articleUrl}`,
  )

  try {
    const res  = await fetch(endpoint, { method: 'POST', body: form })
    const data = await res.json() as { error?: { message: string } }
    if (!res.ok || data.error) {
      console.error(`[ptp] first comment failed: ${data.error?.message ?? JSON.stringify(data)}`)
    }
  } catch (e) {
    console.error('[ptp] first comment network error:', e)
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let articleId: string
  try {
    const body = await req.json() as { articleId?: string }
    if (!body.articleId) throw new Error('missing')
    articleId = body.articleId
  } catch {
    return NextResponse.json({ error: 'articleId is required in request body' }, { status: 400 })
  }

  // ── Fetch article from DB ─────────────────────────────────────────────────
  const article = await getArticleById(articleId)
  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const articleUrl = `${SITE_URL}/news/${article.slug}`

  try {
    // ── 1. Render OG image (self-fetch) ──────────────────────────────────
    console.log(`[ptp] rendering OG image for slug: ${article.slug}`)
    const { bytes: imageBytes, mimeType } = await fetchOgImageBytes(article.slug)
    console.log(`[ptp] OG image ready — ${imageBytes.length} bytes (${mimeType})`)

    // ── 2. Generate bilingual caption + hashtags ──────────────────────────
    console.log('[ptp] generating bilingual caption via HuggingFace…')
    const caption = await generateCaption({
      title:       article.title       ?? '',
      description: article.description ?? '',
      category:    article.category    ?? 'News',
      content:     article.content     ?? '',
    })

    // ── 3. Assemble post text ─────────────────────────────────────────────
    const hashtagLine = caption.hashtags.map(t => `#${t}`).join('  ')

    const postText = [
      caption.english,
      '',
      '— — —',
      '',
      caption.bangla,
      '',
      hashtagLine,
    ].join('\n')

    // ── 4. Upload photo to Facebook page ─────────────────────────────────
    console.log('[ptp] uploading photo to Facebook page…')
    const postId = await uploadPhotoToFacebook({ imageBytes, mimeType, caption: postText })
    console.log(`[ptp] ✓ photo posted — postId: ${postId}`)

    // ── 5. Add article link as first comment ──────────────────────────────
    await addFirstComment(postId, articleUrl)
    console.log('[ptp] ✓ first comment added')

    return NextResponse.json({
      success:    true,
      postId,
      articleUrl,
      caption,
    })
  } catch (err) {
    console.error('[ptp] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PTP failed — check server logs' },
      { status: 500 }
    )
  }
}