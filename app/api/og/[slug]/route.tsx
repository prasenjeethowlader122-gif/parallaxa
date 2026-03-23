// app/api/og/ptp/[slug]/route.tsx

// ❌ edge runtime সরিয়ে দিন — Node.js runtime ব্যবহার হবে
// export const runtime = 'edge'   <-- এই লাইনটা DELETE করুন

import { NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/news-data'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'  // ✅ Node.js runtime

function hasBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text)
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// headline কে lines-এ ভাগ করা (approximate, SVG foreignObject ছাড়া)
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim())
      current = word
    } else {
      current = (current + ' ' + word).trim()
    }
    if (lines.length === 3) break
  }
  if (current && lines.length < 3) lines.push(current.trim())
  return lines.slice(0, 3)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const headline = searchParams.get('headline') ?? ''

  if (!slug) return new NextResponse('Missing slug', { status: 400 })

  const article = await getArticleBySlug(slug)
  if (!article) return new NextResponse('Not found', { status: 404 })

  const displayHeadline = headline || article.title
  const isBangla = hasBengali(displayHeadline)

  const wordCount = article.content?.split(/\s+/).length ?? 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  // ── Font embed (base64) ──
  const fontPath = isBangla
    ? path.join(process.cwd(), 'public/local/font/NotoSerifBengali-Regular.ttf')
    : path.join(process.cwd(), 'public/local/philosopher-font/Philosopher-Bold.ttf')

  const fontBase64 = fs.readFileSync(fontPath).toString('base64')
  const fontMime = 'font/truetype'
  const fontFamily = isBangla ? 'NotoSerifBengali' : 'Philosopher'
  const fontSize = isBangla ? 48 : 54
  const lineHeight = isBangla ? 1.65 : 1.2

  // Logo
  const logoPath = path.join(process.cwd(), 'public/New Project 25 [4D921DE].png')
  const logoBase64 = fs.readFileSync(logoPath).toString('base64')

  // Article image (fetch করে base64)
  let articleImgTag = ''
  if (article.image) {
    try {
      const imgRes = await fetch(article.image)
      if (imgRes.ok) {
        const imgBuf = Buffer.from(await imgRes.arrayBuffer())
        const imgB64 = imgBuf.toString('base64')
        const ct = imgRes.headers.get('content-type') ?? 'image/jpeg'
        articleImgTag = `<image href="data:${ct};base64,${imgB64}" x="0" y="0" width="1080" height="670" preserveAspectRatio="xMidYMid slice"/>`
      }
    } catch { /* fallback gradient */ }
  }

  const lines = wrapText(displayHeadline, isBangla ? 22 : 32)
  const lineHeightPx = fontSize * lineHeight
  const textBlockY = 720  // white panel শুরু হয় ~670px এ

  const svgLines = lines
    .map((line, i) =>
      `<text
        x="48" y="${textBlockY + 80 + i * lineHeightPx}"
        font-family="${fontFamily}"
        font-size="${fontSize}"
        fill="#111111"
        xml:lang="${isBangla ? 'bn' : 'en'}"
      >${escapeXml(line)}</text>`
    )
    .join('\n')

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1080" height="1080">
  <defs>
    <style>
      @font-face {
        font-family: '${fontFamily}';
        src: url('data:${fontMime};base64,${fontBase64}') format('truetype');
      }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1080" fill="#FAFAF7"/>

  <!-- Article photo or gradient -->
  ${articleImgTag || `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#b8cfe8"/>
    <stop offset="100%" stop-color="#6b90b8"/>
  </linearGradient></defs>
  <rect width="1080" height="670" fill="url(#bg)"/>`}

  <!-- Photo scrim -->
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="rgba(0,0,0,0.28)"/>
      <stop offset="55%"  stop-color="rgba(0,0,0,0.06)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.36)"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="670" fill="url(#scrim)"/>

  <!-- Logo -->
  <image href="data:image/png;base64,${logoBase64}"
         x="48" y="36" width="100" height="100"
         style="filter: brightness(0) invert(1); opacity:0.95"/>

  <!-- Date -->
  <text x="1032" y="68" text-anchor="end"
        font-family="Philosopher" font-size="20"
        fill="rgba(255,255,255,0.82)">${escapeXml(formattedDate)}</text>

  <!-- White bottom panel -->
  <rect x="0" y="670" width="1080" height="410" fill="#FAFAF7"/>

  <!-- Category -->
  <text x="48" y="718" font-family="Philosopher" font-size="17"
        font-weight="bold" letter-spacing="2" fill="#C0392B">
    ${escapeXml(article.category.toUpperCase())}
  </text>

  <!-- Divider line -->
  <line x1="220" y1="712" x2="960" y2="712" stroke="#e0ddd6" stroke-width="1"/>

  <!-- Read time -->
  <text x="1032" y="718" text-anchor="end"
        font-family="Philosopher" font-size="16" fill="#aaaaaa">
    ${readTime} min read
  </text>

  <!-- Headline lines -->
  ${svgLines}

  <!-- Footer divider -->
  <line x1="48" y1="1040" x2="1032" y2="1040" stroke="#e8e8e2" stroke-width="1"/>

  <!-- Footer left -->
  <text x="48" y="1065" font-family="Philosopher" font-size="16"
        font-weight="bold" letter-spacing="2" fill="#bbbbbb">PARALLAXA.COM</text>

  <!-- Footer right -->
  <text x="1032" y="1065" text-anchor="end"
        font-family="Philosopher" font-size="16" fill="#C0392B">@parallaxa</text>
</svg>`

  // SVG → PNG via sharp
  const png = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}