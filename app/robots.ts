import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // General crawlers — allow public content, block private/admin areas
        userAgent: '*',
        allow: [
          '/',
          '/article/',
          '/category/',
          '/search',
        ],
        disallow: [
          '/dashboard',
          '/write',
          '/api/',
          '/auth/',
          '/_next/',
        ],
      },
      {
        // Block GPTBot (OpenAI training crawler)
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        // Block common AI training scrapers
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        // Block Anthropic's training crawler (optional — remove if you want Claude to index)
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}