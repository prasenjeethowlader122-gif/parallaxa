import { Metadata } from 'next';
import { NewsArticle, getArticleById, getAllArticles, getArticleBySlug } from '@/lib/news-data'
import ArticlePage from '@/hooks/client/article-page'

export async function generateMetadata({ params }): Promise < Metadata > {
  const article = await getArticleBySlug('championship-team-crowned-after-thrilling-final');
  
  if (!article) {
    return {
      title: 'Article Not Found',
      description: 'The requested news article could not be found.',
      robots: 'noindex, nofollow',
    };
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://v0-parallaxa.vercel.app/';
  const articleUrl = `${baseUrl}/article/${params.slug}`;
  const ogImageUrl = `${baseUrl}/api/og?slug=${params.slug}`;
  
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
      }],
      type: 'article',
      url: articleUrl,
      publishedTime: article.date,
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
    canonical: articleUrl,
  };
}

export default function ArticlePageOpen({ params }) {
  return <ArticlePage slug={params.slug} />
}