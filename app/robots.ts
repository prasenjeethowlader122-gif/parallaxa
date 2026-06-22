/**
 * app/robots.ts
 *
 * The sitemap line now points at /sitemap.xml, which is served by
 * app/sitemap.xml/route.ts as a proper sitemap index document.
 * Previously this pointed at a URL that returned 404 because Next.js's
 * segmented sitemap format only creates /sitemap/0.xml, /sitemap/1.xml, etc.
 */

import type { MetadataRoute } from 'next'

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bangladeshhinduunion.org'
).replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/dashboard/',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Omgilibot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}