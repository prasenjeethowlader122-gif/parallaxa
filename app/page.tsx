'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { BreakingBanner } from '@/components/breaking-banner'
import { CategoryFilter } from '@/components/category-filter'
import { NewsCard } from '@/components/news-card'
import { TrendingSection } from '@/components/trending-section'
import { NewsArticle, getFeaturedArticles, getAllArticles } from '@/lib/news-data'

export default function Home() {
  const [featuredArticles, setFeaturedArticles] = useState<NewsArticle[]>([])
  const [latestArticles, setLatestArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const featured = getFeaturedArticles()
    const latest = getAllArticles().slice(0, 12)
    setFeaturedArticles(featured)
    setLatestArticles(latest)
    setIsLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <BreakingBanner />
      <CategoryFilter />

      <main className="flex-grow">
        {/* Featured Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Featured Stories
            </h2>
            <p className="text-gray-600">The stories you need to read today</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg h-96 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredArticles.map((article) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  variant="featured"
                />
              ))}
            </div>
          )}
        </section>

        {/* Main Content Grid */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Latest Articles */}
              <div className="lg:col-span-2">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Latest News</h2>
                </div>

                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-lg h-32 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {latestArticles.map((article) => (
                      <NewsCard
                        key={article.id}
                        article={article}
                        variant="horizontal"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-32">
                  <TrendingSection />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="bg-black text-white py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-gray-300 mb-8">
              Get the latest news delivered straight to your inbox every morning.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-white text-gray-900 rounded-lg focus:outline-none"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
