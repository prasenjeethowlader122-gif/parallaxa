'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getAllArticles, getArticlesByCategory } from '@/lib/db/articles'

const POSITIONS = [
  { x: 0, scale: 1, opacity: 1, z: 30 },
  { x: 210, scale: 0.82, opacity: 0.6, z: 20 },
  { x: -210, scale: 0.82, opacity: 0.6, z: 20 },
  { x: 0, scale: 0.65, opacity: 0, z: 10 },
]

function CoverFlowSkeleton() {
  return (
    <div className="md:hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-200 mx-4 rounded-full overflow-hidden mb-2 animate-pulse" />

      {/* Stage */}
      <div className="relative h-[220px] flex items-center justify-center overflow-hidden">
        {/* Left ghost card */}
        <div
          className="absolute rounded-xl bg-gray-200 animate-pulse"
          style={{
            width: 320,
            height: 200,
            transform: 'translateX(-210px) scale(0.82)',
            opacity: 0.45,
          }}
        />

        {/* Centre card */}
        <div
          className="absolute rounded-xl bg-gray-200 animate-pulse overflow-hidden"
          style={{ width: 320, height: 200, zIndex: 10 }}
        >
          {/* Inner text lines sit at the bottom, mimicking NewsCard */}
          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 bg-gradient-to-t from-gray-200">
            <div className="h-3 w-16 rounded bg-gray-300" />
            <div className="h-4 w-[90%] rounded bg-gray-300" />
            <div className="h-4 w-[70%] rounded bg-gray-300" />
          </div>
        </div>

        {/* Right ghost card */}
        <div
          className="absolute rounded-xl bg-gray-200 animate-pulse"
          style={{
            width: 320,
            height: 200,
            transform: 'translateX(210px) scale(0.82)',
            opacity: 0.45,
          }}
        />
      </div>

      {/* Nav row */}
      <div className="flex items-center justify-center gap-5 py-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
        <div className="w-9 h-3.5 rounded bg-gray-200 animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
      </div>
    </div>
  )
}
// Fully hidden position for cards beyond the visible range
const HIDDEN_POSITION = { x: 0, scale: 0.5, opacity: 0, z: 0 }

function CoverFlowSlider({ articles }: { articles: NewsArticle[] }) {
  const [current, setCurrent] = useState(0)
  const total = articles.length
  const timerRef = useRef < ReturnType < typeof setInterval > | null > (null)
  const startXRef = useRef(0)
  
  // Guard: don't render if no articles
  if (total === 0) return null
  
  function getPos(cardIdx: number) {
    let offset = (cardIdx - current + total) % total
    if (offset >= POSITIONS.length) {
      return HIDDEN_POSITION
    }
    return POSITIONS[offset]
  }
  
  function goTo(i: number) {
    setCurrent((i + total) % total)
  }
  
  // FIX 5: Wrap stopAuto and startAuto in useCallback to stabilise references
  const stopAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])
  
  const startAuto = useCallback(() => {
    stopAuto()
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total)
    }, 3000)
  }, [total, stopAuto])
  
  useEffect(() => {
    startAuto()
    return () => stopAuto()
  }, [startAuto, stopAuto]) // FIX 5: proper dependency array
  
  return (
    <div className="md:hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-100 mx-4 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-400"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Stage */}
      <div
        className="relative h-[220px] flex items-center justify-center overflow-hidden"
        onPointerDown={e => {
          startXRef.current = e.clientX
          stopAuto()
        }}
        onPointerUp={e => {
          const dx = e.clientX - startXRef.current
          if (dx < -40) goTo(current + 1)
          else if (dx > 40) goTo(current - 1)
        }}
      >
        {articles.map((article, i) => {
          const p = getPos(i)
          return (
            <div
              key={article.id}
              onClick={() => {
                if (i !== current) {
                  stopAuto()
                  goTo(i)
                }
              }}
              style={{
                transform: `translateX(${p.x}px) scale(${p.scale})`,
                opacity: p.opacity,
                zIndex: p.z,
                transition:
                  'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.4s ease',
                pointerEvents: p.opacity === 0 ? 'none' : 'auto',
              }}
              className="absolute h-full rounded-xl w-80 overflow-hidden bg-white cursor-pointer"
            >
              <NewsCard article={article} variant="featured" className="h-full" />
            </div>
          )
        })}
      </div>
    
    { /* Nav row */ }
    <div className="flex items-center justify-center gap-5 py-3">
        <button
          onClick={() => {
            stopAuto()
            goTo(current - 1)
          }}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Previous"
        >
          <span className="block w-2 h-2 border-r border-b border-gray-500 rotate-[135deg] translate-x-px" />
        </button>

        <span className="text-sm text-gray-500 tabular-nums w-9 text-center">
          {current + 1} / {total}
        </span>

        <button
          onClick={() => {
            stopAuto()
            goTo(current + 1)
          }}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Next"
        >
          <span className="block w-2 h-2 border-r border-b border-gray-500 -rotate-45 -translate-x-px" />
        </button>
      </div> </div>
  )
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
      <div className="md:col-span-1 lg:col-span-7 lg:row-span-2 bg-gray-200 rounded-xl animate-pulse h-[540px]" />
      <div className="lg:col-span-5 bg-gray-200 rounded-xl animate-pulse h-[260px]" />
      <div className="lg:col-span-2 bg-gray-200 rounded-xl animate-pulse h-[260px] hidden lg:block" />
      <div className="lg:col-span-3 bg-gray-200 rounded-xl animate-pulse h-[260px] hidden lg:block" />
    </div>
  )
}

export default function Home() {
  const [latestArticles, setLatestArticles] = useState < NewsArticle[] > ([])
  const [isLoading, setIsLoading] = useState(true)
  // FIX 3: consistent naming — was `worlsNews`
  const [worldNews, setWorldNews] = useState < NewsArticle[] > ([])
  const [technologyNews, setTechnologyNews] = useState < NewsArticle[] > ([])
  
  useEffect(() => {
    async function loadData() {
      try {
        const latest = (await getAllArticles()).filter(Boolean).slice(0, 12)
        setLatestArticles(latest)
      } catch (error) {
        console.error('Failed to load articles:', error)
      } finally {
        setIsLoading(false)
      }
      
      try {
        const world = (await getArticlesByCategory('World')).filter(Boolean).slice(0, 4)
        // FIX 1 & 2: was `.slince()` (typo) and missing `await`
        const tech = (await getArticlesByCategory('Technology')).filter(Boolean).slice(0, 4)
        setTechnologyNews(tech)
        setWorldNews(world)
      } catch (e) {
        // FIX 4: log instead of silently swallowing
        console.error('Failed to load category news:', e)
      }
    }
    loadData()
  }, [])
  
  const [mostRecent, second, third, fourth] = latestArticles
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Top Stories</h2>
            <span className="md:hidden text-sm text-blue-600 cursor-pointer">See all</span>
          </div>

{isLoading ? (
  <>
    <CoverFlowSkeleton/>                    {/* mobile */}
    <FeaturedSkeleton />                     {/* desktop (already hidden on mobile via hidden md:block) */}
  </>
) : (
  <>
  <CoverFlowSlider articles = {latestArticles.slice(0,6)}/>
 <div
                className="hidden md:grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-12"
                style={{ gridTemplateRows: 'repeat(2, 260px)' }}
              >
                {mostRecent && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-7 lg:row-span-2 md:h-[260px] lg:h-auto">
                    <NewsCard article={mostRecent} variant="featured" className="h-full" />
                  </div>
                )}
                {second && (
                  <div className="col-span-1 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:h-auto">
                    <NewsCard article={second} variant="featured" className="h-full" />
                  </div>
                )}
                {third && (
                  <div className="col-span-1 lg:col-span-2 lg:col-start-8 lg:row-start-2 lg:h-auto">
                    <NewsCard article={third} variant="featured" className="h-full" />
                  </div>
                )}
                {fourth && (
                  <div className="col-span-1 lg:col-span-3 lg:col-start-10 lg:row-start-2 lg:h-auto">
                    <NewsCard article={fourth} variant="featured" className="h-full" />
                  </div>
                )}
              </div>
            </>

)}
        </section>

        {/* World News */}
        <section className=" py-12 pt-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex flex-row items-center justify-between mb-4 pb-4 border-b-2 border-gray-800">
                  <h2 className="text-2xl font-bold text-gray-900">World</h2>
                  <span className="md:hidden text-sm text-blue-600 cursor-pointer">See all</span>
                </div>
                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg h-32 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* FIX 3: was `worlsNews` */}
                    {worldNews.map(article => (
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
            </div>
          </div>
        </section>

        {/* Technology News */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Tech</h2>
                  <span className="md:hidden text-sm text-blue-600 cursor-pointer">See all</span>
                </div>
                {isLoading ? (
                  <div className="space-y-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg h-32 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {technologyNews.map(article => (
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
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}