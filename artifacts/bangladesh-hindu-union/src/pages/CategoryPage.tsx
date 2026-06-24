import { useState, useEffect } from 'react'
import { useParams } from 'wouter'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'

export default function CategoryPage() {
  const params = useParams<{ slug: string }>()
  const category = params?.slug ?? ''
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!category) return
    setLoading(true)
    fetch(`/api/articles?category=${encodeURIComponent(category)}&status=published&limit=20`)
      .then(r => r.json())
      .then(data => { setArticles(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [category])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 capitalize">{category}</h1>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No articles found in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map(a => <NewsCard key={a.id} article={a} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
