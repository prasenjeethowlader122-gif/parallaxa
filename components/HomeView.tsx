
import { getHomeSections } from '@/lib/db/sections';
import { getLatestArticles, getArticlesByCategory } from '@/lib/db/home';
import { NewsCard } from '@/components/news-card';

export default async function HomeView() {
  const sections = await getHomeSections();
  
  // If no sections configured, show default latest news
  if (sections.length === 0) {
    const latest = await getLatestArticles(10);
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">Latest News</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {latest.map(article => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-16 py-12">
      {sections.map(async (section) => {
        let articles = [];
        if (section.type === 'latest') {
          articles = await getLatestArticles(section.limit_count);
        } else if (section.type === 'category' && section.category_id) {
          articles = await getArticlesByCategory(section.category_id, section.limit_count);
        } else {
          articles = await getLatestArticles(section.limit_count);
        }

        if (articles.length === 0) return null;

        return (
          <section key={section.id} className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
              <button className="text-sm font-bold text-blue-600 hover:underline">View All</button>
            </div>

            <div className={
              section.layout === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                : section.layout === 'list'
                  ? "space-y-6 max-w-4xl"
                  : "flex gap-6 overflow-x-auto pb-4 no-scrollbar"
            }>
              {articles.map((article: any) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  variant={section.layout === 'list' ? 'horizontal' : 'default'}
                  className={section.layout === 'slider' ? 'w-80 shrink-0' : ''}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
