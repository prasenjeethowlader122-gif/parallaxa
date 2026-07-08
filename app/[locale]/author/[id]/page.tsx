
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getAuthorById, getAuthorStats, getArticlesByAuthor } from '@/lib/db/author';
import { User, FileText, Eye, Calendar } from '@phosphor-icons/react/ssr';
import { NewsCard } from '@/components/news-card';
import { notFound } from 'next/navigation';

export default async function AuthorPage({ params }: { params: { id: string, locale: string } }) {
  const { id, locale } = await params;
  const author = await getAuthorById(id);

  if (!author) {
    notFound();
  }

  const stats = await getAuthorStats(id);
  const articles = await getArticlesByAuthor(id);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden mb-6 border-4 border-slate-50">
            {author.image ? (
              <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
            ) : (
              <User size={64} className="text-slate-300" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{author.name}</h1>
          <p className="text-blue-600 font-medium mb-6">{author.role || 'Contributor'}</p>

          {author.bio && (
            <p className="max-w-2xl text-slate-600 leading-relaxed mb-8">
              {author.bio}
            </p>
          )}

          <div className="flex gap-12 border-y border-slate-100 py-6 w-full max-w-lg justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-900">{stats.articles}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Articles</p>
            </div>
            <div className="text-center border-l border-slate-100 pl-12">
              <p className="text-3xl font-bold text-slate-900">{stats.views.toLocaleString()}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Views</p>
            </div>
          </div>
        </div>

        {/* Articles Grid */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Published Articles</h2>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>

          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article: any) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-50 rounded-3xl">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No articles published yet.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
