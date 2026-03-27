import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getArticleBySlug, incrementArticleViews } from '@/lib/news-data';
import ArticlePage from '@/hooks/client/article-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Enforce .pn suffix for metadata too
  if (!slug.endsWith('.pn')) {
    return {
      title: 'Article Not Found',
      description: 'The requested news article could not be found.',
      robots: 'noindex, nofollow',
    };
  }

  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Article Not Found',
      description: 'The requested news article could not be found.',
      robots: 'noindex, nofollow',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app';
  const articleUrl = `${baseUrl}/article/${slug}`;
  const ogImageUrl = `${baseUrl}/api/og/${slug}`;

  return {
    title: article.title,
    description: article.description,
    keywords: article.category,
    authors: [{ name: article.author }],
    openGraph: {
      title: article.title,
      description: article.description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
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
      title: article.title,
      description: article.description,
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Redirect to canonical .pn URL if suffix is missing
  if (!slug.endsWith('.pn')) {
    redirect(`/article/${slug}.pn`);
  }

  // Fire-and-forget view increment (won't block render)
  const article = await getArticleBySlug(slug);
  if (article) {
    incrementArticleViews(article.id).catch(() => {});
  }

  return <ArticlePage slug={slug} />;
}