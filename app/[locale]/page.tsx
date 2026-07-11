import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import HomeView from '@/components/HomeView';
import { getPublishedArticles, getArticlesByCategory } from '@/lib/db/articles';

export default async function HomePage() {
  const publishedArticles = await getPublishedArticles();
  const worldArticles = await getArticlesByCategory('World');
  const techArticles = await getArticlesByCategory('Technology');

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HomeView
        initialLatest={publishedArticles || []}
        initialWorld={worldArticles || []}
        initialTech={techArticles || []}
      />
      <Footer />
    </div>
  );
}
