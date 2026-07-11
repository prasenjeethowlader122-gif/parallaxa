import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import HomeView from '@/components/HomeView';
import { getPublishedArticles, getArticlesByCategory } from '@/lib/db/articles';

export default async function HomePage() {
  const [latest, world, tech] = await Promise.all([
    getPublishedArticles(),
    getArticlesByCategory('World'),
    getArticlesByCategory('Technology'),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HomeView
        initialLatest={latest || []}
        initialWorld={world || []}
        initialTech={tech || []}
      />
      <Footer />
    </div>
  );
}
