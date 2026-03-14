'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { BreakingBanner } from '@/components/breaking-banner'
import { NewsCard } from '@/components/news-card'
import { TrendingSection } from '@/components/trending-section'
import { NewsArticle, getFeaturedArticles, getAllArticles } from '@/lib/db/articles'

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-[220px]">
      {/* Large left cell */}
      <div className="md:col-span-1 lg:col-span-7 lg:row-span-2 bg-gray-200 rounded-xl animate-pulse" />
      {/* Top-right */}
      <div className="lg:col-span-5 bg-gray-200 rounded-xl animate-pulse" />
      {/* Bottom-right split */}
      <div className="lg:col-span-2 bg-gray-200 rounded-xl animate-pulse hidden lg:block" />
      <div className="lg:col-span-2 bg-gray-200 rounded-xl animate-pulse hidden lg:block" />
      <div className="lg:col-span-1 bg-gray-200 rounded-xl animate-pulse hidden lg:block" />
    </div>
  )
}

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
  const [mostRecent, second, third, fourth] = [...featuredArticles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <BreakingBanner />

      <main className="flex-grow">
        {/* ── Featured Section ── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Top Stories</h2>
          {isLoading ? (
            <FeaturedSkeleton />
          ) : (
            /**
             * Responsive grid strategy
             * ─────────────────────────────────────────────────────────
             * Mobile  (< md)   : single column stack, each card natural height
             * Tablet  (md–lg)  : 2 equal columns, all cards same row height
             * Desktop (≥ lg)   : 12-column grid, 2 fixed rows of 260 px
             *
             *   ┌─────────────────────┬───────────────┐  row 1 (260 px)
             *   │                     │   second      │
             *   │   mostRecent        ├───────┬───────┤  row 2 (260 px)
             *   │   (spans 2 rows)    │ third │fourth │
             *   └─────────────────────┴───────┴───────┘
             *    7 cols                2 cols  3 cols
             * ─────────────────────────────────────────────────────────
             */
             
            <div
              className=" space-y-4
                grid gap-4 
                grid-cols-1
                md:grid-cols-2
                lg:grid-cols-12 lg:grid-rows-2
              "
              style={{ gridAutoRows: '260px' }}
            >
              {/* ① Large hero card — left 7 cols, spans both rows */}
              {mostRecent && (
                <div className="
                  col-span-1 
                  md:col-span-2
                  lg:col-span-7 lg:row-span-2
               lg:min-h-0
                ">
                  <NewsCard
                    article={mostRecent}
                    variant="featured"
                    className="h-full"
                  />
                </div>
              )}

              {/* ② Top-right card — cols 8–12, row 1 */}
              {second && (
                <div className="
                  col-span-1
                  lg:col-span-5 lg:col-start-8 lg:row-start-1
                  min-h-[200px] lg:min-h-0
                ">
                  <NewsCard
                    article={second}
                    variant="featured"
                    className="h-full"
                  />
                </div>
              )}

              {/* ③ Bottom-right — cols 8–9, row 2 */}
              {third && (
                <div className="
                  col-span-1
                  lg:col-span-2 lg:col-start-8 lg:row-start-2
                  min-h-[200px] lg:min-h-0
                ">
                  <NewsCard
                    article={third}
                    variant="featured"
                    className="h-full"
                  />
                </div>
              )}

              {/* ④ Bottom-right — cols 10–12, row 2 */}
              {fourth && (
                <div className="
                  col-span-1
                  lg:col-span-3 lg:col-start-10 lg:row-start-2
                  min-h-[200px] lg:min-h-0
                ">
                  <NewsCard
                    article={fourth}
                    variant="featured"
                    className="h-full"
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Main Content Grid ── */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Latest Articles */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Latest News</h2>

                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg h-32 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {latestArticles.map((article) => (
                      <NewsCard
                        key={article.id ?? 'null'}
                        article={article}
                        variant="horizontal"
                        className="my-2"
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