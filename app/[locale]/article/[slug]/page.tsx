import { Metadata } from 'next';
import { getArticleBySlug, incrementArticleViews } from '@/lib/db/articles';
import { translateBatch } from '@/lib/trans';
import ArticlePage from '@/hooks/client/article-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
      description: 'The requested news article could not be found.',
      robots: 'noindex, nofollow',
    };
  }

  let title = article.title;
  let description = article.description;

  if (locale !== 'en') {
    const translated = await translateBatch([article.title, article.description], locale);
    title = translated[0];
    description = translated[1];
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-exposer.vercel.app';
  const articleUrl = `${baseUrl}/${locale}/article/${slug}`;
  const ogImageUrl = `${baseUrl}/api/og/${slug}`;

  return {
    title,
    description,
    keywords: article.category,
    authors: [{ name: article.author }],
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: 'image/png',
        },
      ],
      type: 'article',
      url: articleUrl,
      publishedTime: article.date.toISOString(),
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    alternates: {
      canonical: articleUrl,
    },
  };
}

export default async function ArticlePageOpen({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return <ArticlePage slug={slug} />;
  }

  incrementArticleViews(article.id).catch(() => {});

  let translatedArticle = { ...article };
  if (locale !== 'en') {
    const textsToTranslate = [article.title, article.description, article.content];
    const translated = await translateBatch(textsToTranslate, locale);
    translatedArticle.title = translated[0];
    translatedArticle.description = translated[1];
    translatedArticle.content = translated[2];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: translatedArticle.title,
            description: translatedArticle.description,
            image: [translatedArticle.image],
            datePublished: translatedArticle.date.toISOString(),
            dateModified: translatedArticle.updatedAt ? new Date(translatedArticle.updatedAt).toISOString() : translatedArticle.date.toISOString(),
            author: [
              {
                '@type': 'Person',
                name: translatedArticle.author,
              },
            ],
          }),
        }}
      />
      <ArticlePage initialArticle={translatedArticle} />
    </>
  );
}