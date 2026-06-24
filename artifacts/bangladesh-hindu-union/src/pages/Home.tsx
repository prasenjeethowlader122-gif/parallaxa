import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import HomeClient from '@/components/HomeView'
import { NewsArticle } from '@/lib/db/articles'

export default function Home() {
  const [latestArticles, setLatest] = useState<NewsArticle[]>([])
  const [worldNews, setWorld] = useState<NewsArticle[]>([])
  const [technologyNews, setTech] = useState<NewsArticle[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/articles?limit=6&offset=0').then(r => r.json()).catch(() => []),
      fetch('/api/articles?category=World&status=published&limit=6').then(r => r.json()).catch(() => []),
      fetch('/api/articles?category=Technology&status=published&limit=6').then(r => r.json()).catch(() => []),
    ]).then(([latest, world, tech]) => {
      setLatest(Array.isArray(latest) ? latest : [])
      setWorld(Array.isArray(world) ? world : [])
      setTech(Array.isArray(tech) ? tech : [])
    })
  }, [])

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
