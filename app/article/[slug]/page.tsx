// app/news/[slug]/page.tsx
import { Metadata } from 'next';
import { NewsArticle, getArticleById, getAllArticles , getArticleBySlug} from '@/lib/news-data' // your data fetching function
import ArticlePage from '@/hooks/client/article-page'
// generateMetadata is an async function that can fetch data
export async function generateMetadata({ params }): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug); // Fetch article details

  if (!article) {
    return {
      title: 'Article Not Found',
      description: 'The requested news article could not be found.',
    };
  }

  return {
    title: article.title,
    description: article.description,
    openGraph: { // Open Graph metadata for social media sharing
      title: article.title,
      description: article.description,
      images: [{ url: article.image }],
      type: 'article', // Specifies the content is an article
      //publishedTime: article.published_date,
    },
    twitter: { // Twitter card metadata
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [article.image],
    },
    // Add JSON-LD structured data for rich snippets in search results
    // You would typically use a <script> tag for this within the component or other mechanisms
  };
}

export default function ArticlePage({ params }) {
  return <><ArticlePage slug = {params.slug}/></>
}
