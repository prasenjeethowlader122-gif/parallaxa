'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getFeaturedArticles, getTrendingArticles } from '@/lib/news-data'
import { User, LogOut, Bookmark, Eye } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [featuredArticles, setFeaturedArticles] = useState<NewsArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([])
  const [savedArticles, setSavedArticles] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    setFeaturedArticles(getFeaturedArticles())
    setTrendingArticles(getTrendingArticles())
    // Load saved articles from localStorage
    const saved = localStorage.getItem('savedArticles')
    if (saved) {
      setSavedArticles(JSON.parse(saved))
    }
  }, [])

  const toggleSaveArticle = (articleId: string) => {
    setSavedArticles((prev) => {
      const updated = prev.includes(articleId)
        ? prev.filter((id) => id !== articleId)
        : [...prev, articleId]
      localStorage.setItem('savedArticles', JSON.stringify(updated))
      return updated
    })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow bg-gray-50">
        {/* Dashboard Header */}
        <div className="bg-white border-b border-gray-200 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                  </div>
                  Welcome, {session.user.name}
                </h1>
                <p className="text-gray-600 mt-2">{session.user.email}</p>
              </div>
              <button
                onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Featured Articles */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Featured For You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {featuredArticles.map((article) => (
                    <div key={article.id} className="relative">
                      <NewsCard article={article} variant="default" />
                      <button
                        onClick={() => toggleSaveArticle(article.id)}
                        className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                          savedArticles.includes(article.id)
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                        title={savedArticles.includes(article.id) ? 'Remove from saved' : 'Save article'}
                      >
                        <Bookmark className="w-4 h-4" fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Trending Articles */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Trending Now
                </h2>
                <div className="space-y-4">
                  {trendingArticles.slice(0, 5).map((article, index) => (
                    <div key={article.id} className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/article/${article.id}`}>
                          <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-red-600 transition-colors">
                            {article.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {(article.views / 1000).toFixed(1)}K views
                          </div>
                          <span>{article.category}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSaveArticle(article.id)}
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                          savedArticles.includes(article.id)
                            ? 'bg-red-50 text-red-600'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="font-bold text-gray-900 mb-6">Your Activity</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">
                      {savedArticles.length}
                    </p>
                    <p className="text-sm text-gray-600">Saved Articles</p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-3xl font-bold text-gray-900">12</p>
                    <p className="text-sm text-gray-600">Articles Read</p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Settings</h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700">
                    Email Preferences
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700">
                    Reading History
                  </button>
                  <button className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-sm text-gray-700">
                    Saved Articles
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
