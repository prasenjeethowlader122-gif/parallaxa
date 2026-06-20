// app/api/og/ptp/[slug]/route.tsx
import { NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/db/articles'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import * as opentype from 'opentype.js'

export const runtime = 'nodejs'

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

// opentype.js দিয়ে text → SVG path
function textToPath(
  font: opentype.Font,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string
): string {
  const p = font.getPath(text, x, y, fontSize)
  const pathData = p.toSVG(2)
  // fill color inject করতে হবে
  return pathData.replace('<path ', `<path fill="${color}" `)
}

// text wrap করা
function wrapText(font: opentype.Font, text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const test = current ? current + ' ' + word : word
    const w = font.getAdvanceWidth(test, fontSize)
    if (w > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === 3) break
    } else {
      current = test
    }
  }
  if (current && lines.length < 3) lines.push(current)
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

  // ── Fonts load ──
  const philosopherPath = path.join(process.cwd(), 'public/local/philosopher-font/Philosopher-Bold.ttf')
  const bengaliPath = path.join(process.cwd(), 'public/local/font/NotoSerifBengali-Regular.ttf')

  const philosopherFont = opentype.loadSync(philosopherPath)
  const headlineFont = isBangla
    ? opentype.loadSync(bengaliPath)
    : philosopherFont

  // ── Logo base64 ──
  const logoPath = path.join(process.cwd(), 'public/New Project 25 [4D921DE].png')
  const logoBase64 = fs.readFileSync(logoPath).toString('base64')

  // ── Article image ──
  let articleImgTag = ''
  if (article.image) {
    try {
      const imgRes = await fetch(article.image)
      if (imgRes.ok) {
        const imgBuf = Buffer.from(await imgRes.arrayBuffer())
        const ct = imgRes.headers.get('content-type') ?? 'image/jpeg'
        articleImgTag = `<image href="data:${ct};base64,${imgBuf.toString('base64')}"
          x="0" y="0" width="1080" height="670" preserveAspectRatio="xMidYMid slice"/>`
      }
    } catch { /* fallback */ }
  }

  // ── Text → paths ──
  const headlineFontSize = isBangla ? 48 : 54
  const lineHeightPx = isBangla ? 80 : 68
  const maxWidth = 984 // 1080 - 48*2

  const lines = wrapText(headlineFont, displayHeadline, headlineFontSize, maxWidth)

  const headlinePaths = lines
    .map((line, i) =>
      textToPath(headlineFont, line, 48, 800 + i * lineHeightPx, headlineFontSize, '#111111')
    )
    .join('\n')

  // UI text paths (Philosopher দিয়ে)
  const categoryPath = textToPath(philosopherFont, article.category.toUpperCase(), 48, 718, 17, '#C0392B')
  const datePath = (() => {
    const w = philosopherFont.getAdvanceWidth(formattedDate, 20)
    return textToPath(philosopherFont, formattedDate, 1032 - w, 68, 20, 'rgba(255,255,255,0.82)')
  })()
  const readTimePath = (() => {
    const rt = `${readTime} min read`
    const w = philosopherFont.getAdvanceWidth(rt, 16)
    return textToPath(philosopherFont, rt, 1032 - w, 718, 16, '#aaaaaa')
  })()
  const footerLeftPath = textToPath(philosopherFont, 'EXPOSER.COM', 48, 1065, 16, '#bbbbbb')
  const footerRightPath = (() => {
    const w = philosopherFont.getAdvanceWidth('@exposer', 16)
    return textToPath(philosopherFont, '@exposer', 1032 - w, 1065, 16, '#C0392B')
  })()

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="1080" height="1080">

  <!-- Background -->
  <rect width="1080" height="1080" fill="#FAFAF7"/>

  <!-- Article photo or gradient -->
  ${articleImgTag || `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b8cfe8"/>
      <stop offset="100%" stop-color="#6b90b8"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="670" fill="url(#bg)"/>`}

  <!-- Photo scrim -->
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.28"/>
      <stop offset="55%"  stop-color="#000000" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.36"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="670" fill="url(#scrim)"/>

  <!-- Logo -->
  <image href="data:image/png;base64,${logoBase64}"
         x="48" y="36" width="100" height="100"/>

  <!-- Date (path) -->
  ${datePath}

  <!-- White bottom panel -->
  <rect x="0" y="670" width="1080" height="410" fill="#FAFAF7"/>

  <!-- Category (path) -->
  ${categoryPath}

  <!-- Divider -->
  <line x1="240" y1="712" x2="960" y2="712" stroke="#e0ddd6" stroke-width="1"/>

  <!-- Read time (path) -->
  ${readTimePath}

  <!-- Headline (paths) -->
  ${headlinePaths}

  <!-- Footer divider -->
  <line x1="48" y1="1040" x2="1032" y2="1040" stroke="#e8e8e2" stroke-width="1"/>

  <!-- Footer (paths) -->
  ${footerLeftPath}
  ${footerRightPath}
</svg>`

  const png = await sharp(Buffer.from(svg)).png().toBuffer()

  return new NextResponse(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}