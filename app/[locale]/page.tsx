import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getAllArticles, getArticlesByCategory } from '@/lib/db/articles'
import HomeClient from '@/components/HomeView'

const FEATURED_COUNT = 6
const CATEGORY_LIMIT = 6

export default async function Home() {
  const [latestArticles, worldNews, technologyNews] = await Promise.all([
    getAllArticles(FEATURED_COUNT, 0),
    getArticlesByCategory('World').then(articles => articles.slice(0, CATEGORY_LIMIT)),
    getArticlesByCategory('Technology').then(articles => articles.slice(0, CATEGORY_LIMIT))
  ])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <HomeClient
        initialLatest={latestArticles}
        initialWorld={worldNews}
        initialTech={technologyNews}
      />
      <Footer />
    </div>
  )
}
