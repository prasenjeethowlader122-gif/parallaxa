import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import HomeView from '@/components/HomeView';
import { getHomeSections } from '@/lib/db/sections';
import { getLatestArticles, getArticlesByCategory as getHomeArticlesByCategory } from '@/lib/db/home';
import { getFeaturedArticles, getTrendingArticles } from '@/lib/db/articles';

export default async function HomePage() {
  let dbSections: any[] = [];
  
  try {
    dbSections = await getHomeSections();
    alert(JSON.stringify(dbSections))
  } catch (err) {
    console.error('Failed to get home sections:', err);
  }

  // Fallback to defaults if no active sections configured
  if (!dbSections || dbSections.length === 0) {
    dbSections = [
      {
        id: 1,
        title: 'Latest News',
        type: 'latest',
        layout: 'grid',
        limit_count: 6,
        is_active: true,
        order_index: 0,
      },
      {
        id: 2,
        title: 'World News',
        type: 'category',
        category_id: 7, // World
        layout: 'list',
        limit_count: 10,
        is_active: true,
        order_index: 1,
      },
      {
        id: 3,
        title: 'Technology',
        type: 'category',
        category_id: 2, // Technology
        layout: 'list',
        limit_count: 10,
        is_active: true,
        order_index: 2,
      }
    ];
  }

  // Fetch articles for each section dynamically
  const sectionsWithArticles = await Promise.all(
    dbSections.map(async (section: any) => {
      let articles: any[] = [];
      const limit = section.limit_count || 10;
      try {
        if (section.type === 'latest') {
          articles = await getLatestArticles(limit);
        } else if (section.type === 'category' && section.category_id) {
          articles = await getHomeArticlesByCategory(section.category_id, limit);
        } else if (section.type === 'featured') {
          const featured = await getFeaturedArticles();
          articles = featured.slice(0, limit);
        } else if (section.type === 'trending') {
          const trending = await getTrendingArticles();
          articles = trending.slice(0, limit);
        }
      } catch (err) {
        console.error(`Failed to fetch articles for section ${section.title}:`, err);
      }
      return {
        id: section.id,
        title: section.title,
        type: section.type,
        layout: section.layout || 'grid',
        articles: articles || [],
      };
    })
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HomeView sections={sectionsWithArticles} />
      <Footer />
    </div>
  );
}
