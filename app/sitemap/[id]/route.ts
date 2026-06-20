/**
 * app/sitemap/[id]/route.ts
 *
 * Serves individual sitemap segments at /sitemap/0.xml, /sitemap/1.xml, …
 *
 * Why this replaces app/sitemap.ts:
 *   Next.js's built-in segmented sitemap support (generateSitemaps + default
 *   export) routes requests to /sitemap/0.xml etc., but it does NOT create
 *   a /sitemap.xml index automatically. Search engines that follow the
 *   robots.txt `Sitemap:` directive expect /sitemap.xml to exist.
 *
 *   By moving the logic into an explicit route handler we:
 *     1. Keep the same /sitemap/[id].xml URLs that Next.js would have generated.
 *     2. Let app/sitemap.xml/route.ts serve a proper sitemap index at /sitemap.xml.
 *     3. Retain full control over caching headers.
 *
 * Segment layout:
 *   id = 0  →  static pages (home, search) + category pages
 *   id = 1  →  articles published on dates[0]  (most recent date)
 *   id = 2  →  articles published on dates[1]
 *   …
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getUniqueArticleDates,
  getArticlesByDate,
} from '@/lib/db/articles'

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-exposer.vercel.app'
).replace(/\/$/, '')

// These match the category slugs used in app/category/[name]/page.tsx
const CATEGORIES = [
  'Business',
  'Technology',
  'Sports',
  'Entertainment',
  'Science',
  'Health',
  'World',
] as
const

// Revalidate segments hourly so new articles show up quickly
export const revalidate = 3600

// ── XML helpers ───────────────────────────────────────────────────────────────

function urlEntry(params: {
  loc: string
  lastmod ? : Date | string
  priority ? : number
  changefreq ? : string
  images ? : Array < { url: string;title: string } >
}): string {
  const lines: string[] = [`  <url>`, `    <loc>${params.loc}</loc>`]
  
  if (params.lastmod) {
    const d = params.lastmod instanceof Date ?
      params.lastmod :
      new Date(params.lastmod)
    if (!isNaN(d.getTime())) {
      lines.push(`    <lastmod>${d.toISOString().split('T')[0]}</lastmod>`)
    }
  }
  
  if (params.changefreq) {
    lines.push(`    <changefreq>${params.changefreq}</changefreq>`)
  }
  
  if (params.priority !== undefined) {
    lines.push(`    <priority>${params.priority.toFixed(1)}</priority>`)
  }
  
  if (params.images?.length) {
    for (const img of params.images) {
      lines.push(
        `    <image:image>`,
        `      <image:loc>${img.url}</image:loc>`,
        `      <image:title><![CDATA[${img.title}]]></image:title>`,
        `    </image:image>`,
      )
    }
  }
  
  lines.push(`  </url>`)
  return lines.join('\n')
}

function buildXml(entries: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...entries,
    '</urlset>',
  ].join('\n')
}

// ── Segment builders ──────────────────────────────────────────────────────────

/** Segment 0 — static pages + all category pages */
function buildStaticSegment(): string {
  const entries: string[] = [
    urlEntry({
      loc: BASE_URL,
      lastmod: new Date(),
      priority: 1.0,
      changefreq: 'hourly',
    }),
    urlEntry({
      loc: `${BASE_URL}/search`,
      lastmod: new Date(),
      priority: 0.5,
      changefreq: 'weekly',
    }),
  ]
  
  for (const cat of CATEGORIES) {
    entries.push(
      urlEntry({
        loc: `${BASE_URL}/category/${encodeURIComponent(cat.toLowerCase())}`,
        lastmod: new Date(),
        priority: 0.8,
        changefreq: 'daily',
      }),
    )
  }
  
  return buildXml(entries)
}

/** Segments 1..N — one per unique published date */
async function buildArticleSegment(dateString: string): Promise < string > {
  const articles = await getArticlesByDate(dateString)
  
  const entries = articles.map(article => {
    const imageUrl = article.ogImage ?? article.image ?? null
    return urlEntry({
      loc: `${BASE_URL}/article/${article.slug}`,
      lastmod: article.updatedAt ?? article.date,
      changefreq: 'monthly',
      priority: article.featured ? 0.9 : article.trending ? 0.85 : 0.7,
      images: imageUrl ?
        [{ url: imageUrl, title: article.title }] :
        undefined,
    })
  })
  
  return buildXml(entries)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest, { params }: { params: Promise < { id: string } > },
) {
  const { id } = await params
  const segmentId = parseInt(id, 10)
  
  // Reject non-numeric or negative segment IDs immediately
  if (isNaN(segmentId) || segmentId < 0) {
    return new NextResponse('Not found', { status: 404 })
  }
  
  try {
    let xml: string
    
    if (segmentId === 0) {
      xml = buildStaticSegment()
    } else {
      const dates = await getUniqueArticleDates()
      const dateString = dates[segmentId - 1] // id=1 → dates[0], id=2 → dates[1], …
      
      if (!dateString) {
        return new NextResponse('Not found', { status: 404 })
      }
      
      xml = await buildArticleSegment(dateString)
    }
    
    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (err) {
    console.error('[sitemap] segment error:', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
}