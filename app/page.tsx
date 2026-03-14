'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { BreakingBanner } from '@/components/breaking-banner'
import { CategoryFilter } from '@/components/category-filter'
import { NewsCard } from '@/components/news-card'
import { TrendingSection } from '@/components/trending-section'
import { NewsArticle, getFeaturedArticles, getAllArticles } from '@/lib/db/articles'

export default function Home() {
  const [featuredArticles, setFeaturedArticles] = useState < NewsArticle[] > ([])
  const [latestArticles, setLatestArticles] = useState < NewsArticle[] > ([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function loadData() {
      try {
        const featured = (await getFeaturedArticles()).filter(Boolean)
        const latest = (await getAllArticles()).filter(Boolean).slice(0, 12)
        
        setFeaturedArticles(featured)
        setLatestArticles(latest)
      } catch (error) {
        console.error('Failed to load articles:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])
  
  // Sort featured articles by date descending; most recent goes in the big cell
  const sortedFeatured = [...featuredArticles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const [mostRecent, second, third, fourth] = sortedFeatured
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <BreakingBanner />

      <main className="flex-grow">
        {/* Featured Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {isLoading ? (
            <div className="grid grid-cols-5 grid-rows-5 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg animate-pulse"
                  style={{ minHeight: '12rem' }}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 grid-rows-5 gap-4">
              {/* Large cell — most recent article */}
              {mostRecent && (
                <div className="col-span-3 row-span-3">
                  <NewsCard
                    key={mostRecent.id || 'most-recent'}
                    className="h-full"
                    article={mostRecent}
                    variant="vertical"
                  />
                </div>
              )}

              {/* Top-right cell — second article */}
              {second && (
                <div className="col-span-2 row-span-2 col-start-4">
                  <NewsCard
                    key={second.id || 'second'}
                    className="h-full"
                    article={second}
                    variant="vertical"
                  />
                </div>
              )}

              {/* Bottom-right first small cell — third article */}
              {third && (
                <div className="col-start-4 row-start-3">
                  <NewsCard
                    key={third.id || 'third'}
                    className="h-full"
                    article={third}
                    variant="vertical"
                  />
                </div>
              )}

              {/* Bottom-right second small cell — fourth article */}
              {fourth && (
                <div className="col-start-5 row-start-3">
                  <NewsCard
                    key={fourth.id || 'fourth'}
                    className="h-full"
                    article={fourth}
                    variant="vertical"
                  />
                </div>
              )}
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
                        key={article.id || 'null'}
                        className="my-2"
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
      </main>

      <Footer />
    </div>
  )
}