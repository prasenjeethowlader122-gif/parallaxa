/**
 * app/sitemap.xml/route.ts
 *
 * Serves GET /sitemap.xml as a sitemap index document.
 *
 * A sitemap index lists the locations of individual sitemap files.
 * Search engines fetch this first, then follow each <loc> to get
 * the real URLs.
 *
 * Why this file exists:
 *   Next.js only serves segmented sitemaps at /sitemap/0.xml,
 *   /sitemap/1.xml, … when a file exports generateSitemaps().
 *   It does NOT automatically create /sitemap.xml in that case,
 *   so crawlers following the robots.txt link would hit a 404.
 *   This route fills that gap by generating the index on demand.
 */

import { NextResponse } from 'next/server'
import { getUniqueArticleDates } from '@/lib/db/articles'

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '')

// Revalidate the index once per hour so new article dates appear quickly
// without hammering the DB on every request.
export const revalidate = 3600

export async function GET() {
  // Segment 0 is the static sitemap (home + categories).
  // Segments 1..N correspond to each unique published date.
  const dates = await getUniqueArticleDates()
  const totalSegments = 1 + dates.length // segment 0 + one per date

  const entries = Array.from({ length: totalSegments }, (_, i) => {
    // Use the same path that Next.js generates for segmented sitemaps
    const loc = `${BASE_URL}/sitemap/${i}.xml`
    return `  <sitemap>\n    <loc>${loc}</loc>\n  </sitemap>`
  }).join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</sitemapindex>',
  ].join('\n')

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Let CDNs and browsers cache the index for up to an hour
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}