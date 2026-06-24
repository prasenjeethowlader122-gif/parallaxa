import type { NewsArticle } from '@/lib/db/articles'

/**
 * Generates Next.js metadata object from a NewsArticle.
 * Use in generateMetadata() in your article page.
 *
 * @example
 * export async function generateMetadata({ params }) {
 *   const article = await getArticleBySlug(params.slug)
 *   if (!article) return {}
 *   return buildArticleMetadata(article, 'https://yoursite.com')
 * }
 */
export function buildArticleMetadata(
  article: NewsArticle,
  siteUrl: string,
  siteName = 'Your News Site'
) {
  const title       = article.seoTitle       || article.title
  const description = article.metaDescription || article.description
  const image       = article.ogImage         || article.image
  const url         = `${siteUrl}/article/${article.slug}`

  return {
    title,
    description,
    keywords:  article.focusKeyword || undefined,
    ...(article.canonicalUrl && {
      alternates: { canonical: article.canonicalUrl },
    }),
    ...(article.noIndex && {
      robots: { index: false, follow: false },
    }),
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: 'article',
      publishedTime: article.date.toISOString(),
      authors: [article.author],
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: article.twitterCard ?? 'summary_large_image',
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

/**
 * JSON-LD structured data for a NewsArticle.
 * Drop the output into a <script type="application/ld+json"> tag.
 */
export function buildArticleJsonLd(article: NewsArticle, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type':    'NewsArticle',
    headline:   article.title,
    description: article.description,
    image:       article.image ? [article.image] : undefined,
    datePublished: article.date.toISOString(),
    dateModified:  article.updatedAt?.toISOString() ?? article.date.toISOString(),
    author: [{
      '@type': 'Person',
      name: article.author,
      url:  `${siteUrl}/author/${article.author.toLowerCase().replace(/\s+/g, '-')}`,
    }],
    publisher: {
      '@type': 'Organization',
      name: 'Your News Site',
      url:  siteUrl,
    },
    mainEntityOfPage: {
      '@type': '@id',
      '@id':   `${siteUrl}/article/${article.slug}`,
    },
    keywords: article.focusKeyword ?? undefined,
    articleSection: article.category,
  }
}
