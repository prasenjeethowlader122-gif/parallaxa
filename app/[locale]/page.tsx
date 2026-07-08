import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getAllArticles, getArticlesByCategory, getBreakingNews, getTrendingArticles } from '@/lib/db/articles'
import { getHomeSections } from '@/lib/db/home-sections'
import HomeClient from '@/components/HomeView'

export default async function Home() {
  const sections = await getHomeSections()

  const sectionsWithData = await Promise.all(
    sections.map(async (section) => {
      let articles = []
      if (section.type === 'breaking') {
        articles = await getBreakingNews()
      } else if (section.type === 'trending') {
        articles = await getTrendingArticles()
      } else if (section.category) {
        articles = await getArticlesByCategory(section.category)
      } else {
        articles = await getAllArticles(section.limit, 0)
      }

      return {
        ...section,
        articles: articles.slice(0, section.limit)
      }
    })
  )

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <HomeClient sections={sectionsWithData} />
      <Footer />
    </div>
  )
}
