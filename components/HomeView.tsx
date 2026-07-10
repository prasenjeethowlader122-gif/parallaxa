'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

import { getHomeSections } from '@/lib/db/sections';
import { getLatestArticles, getArticlesByCategory } from '@/lib/db/home';
import { NewsCard } from '@/components/news-card';
const FEATURED_COUNT = 6

const POSITIONS = [
  { x: 0, scale: 1, opacity: 1, z: 30 },
  { x: 210, scale: 0.82, opacity: 0.6, z: 20 },
  { x: -210, scale: 0.82, opacity: 0.6, z: 20 },
  { x: 0, scale: 0.65, opacity: 0, z: 10 },
]

const HIDDEN_POSITION = { x: 0, scale: 0.5, opacity: 0, z: 0 }

function CoverFlowSlider({ articles }: { articles: NewsArticle[] }) {
  const total = articles.length
  const [current, setCurrent] = useState(0)
  const timerRef = useRef < NodeJS.Timeout | null > (null)
  const startXRef = useRef(0)
  
  const getPos = useCallback(
    (cardIdx: number) => {
      const offset = (cardIdx - current + total) % total
      if (offset >= POSITIONS.length) return HIDDEN_POSITION
      return POSITIONS[offset]
    },
    [current, total]
  )
  
  const goTo = useCallback(
    (i: number) => {
      setCurrent((i + total) % total)
    },
    [total]
  )
  
  const stopAuto = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])
  
  const startAuto = useCallback(() => {
    stopAuto()
    if (total <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total)
    }, 3000)
  }, [total, stopAuto])
  
  useEffect(() => {
    startAuto()
    return () => stopAuto()
  }, [startAuto, stopAuto])
  
  if (total === 0) return null
  
  return (
    <div className="md:hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-200 mx-4 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-primary rounded-full transition-all duration-400"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Stage */}
      <div
        className="relative h-[220px] flex items-center justify-center overflow-hidden touch-pan-y"
        onPointerDown={(e) => {
          startXRef.current = e.clientX
          stopAuto()
        }}
        onPointerUp={(e) => {
          const dx = e.clientX - startXRef.current
          if (dx < -40) goTo(current + 1)
          else if (dx > 40) goTo(current - 1)
          startAuto()
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
              className="absolute h-full rounded-xl w-80 overflow-hidden bg-background cursor-pointer"
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
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Previous"
        >
          <span className="block w-2 h-2 border-r border-b border-gray-500 rotate-[135deg] translate-x-px" />
        </button>

        <span className="text-sm text-muted-foreground tabular-nums w-9 text-center">
          {current + 1} / {total}
        </span>

        <button
          onClick={() => {
            stopAuto()
            goTo(current + 1)
          }}
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-accent transition-colors"
          aria-label="Next"
        >
          <span className="block w-2 h-2 border-r border-b border-gray-500 -rotate-45 -translate-x-px" />
        </button>
      </div> </div>
  )
}
export default async function HomeView() {
  const sections = await getHomeSections();
  const lat = await getLatestArticles(10);
   
  // If no sections configured, show default latest news
  if (sections.length === 0) {
    const latest = await getLatestArticles(10);
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">Latest News</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {latest.map(article => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    );
  }
  
  return (
    <div className="space-y-16 py-12">
      <CoverFlowSlider articles={lat} />
      {sections.map(async (section) => {
        let articles = [];
        if (section.type === 'latest') {
          articles = await getLatestArticles(section.limit_count);
        } else if (section.type === 'category' && section.category_id) {
          articles = await getArticlesByCategory(section.category_id, section.limit_count);
        } else {
          articles = await getLatestArticles(section.limit_count);
        }

        if (articles.length === 0) return null;

        return (
        
          <section key={section.id} className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
              <button className="text-sm font-bold text-blue-600 hover:underline">View All</button>
            </div>

            <div className={
                  "flex gap-6 overflow-x-auto pb-4 no-scrollbar"
            }>
              {articles.map((article: any) => (
                <NewsCard
                  key={article.id}
                  article={article}
                  variant={section.layout === 'list' ? 'horizontal' : 'default'}
                  className={section.layout === 'slider' ? 'w-80 shrink-0' : ''}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
