'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { NewsCard } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'
import {
  House,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  Flask,
  Pulse,
  ChatTeardropText,
  NotePencil,
  Sparkle,
  TrendUp
} from '@phosphor-icons/react/ssr'

// Each entry: horizontal offset, scale, opacity, stacking order, and a
// shadow that deepens as a card approaches the center (z index 30 = focused).
const POSITIONS = [
  { x: 0, scale: 1, opacity: 1, z: 30, shadow: '0 20px 40px -12px rgba(15,23,42,0.35)' },
  { x: 210, scale: 0.82, opacity: 0.55, z: 20, shadow: '0 10px 24px -10px rgba(15,23,42,0.25)' },
  { x: -210, scale: 0.82, opacity: 0.55, z: 20, shadow: '0 10px 24px -10px rgba(15,23,42,0.25)' },
  { x: 0, scale: 0.65, opacity: 0, z: 10, shadow: 'none' },
]

const HIDDEN_POSITION = { x: 0, scale: 0.5, opacity: 0, z: 0, shadow: 'none' }
const SWIPE_FRACTION = 0.18 // fraction of stage width needed to trigger a slide change
const AUTOPLAY_MS = 4000

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function CoverFlowSlider({ articles }: { articles: NewsArticle[] }) {
  const displayArticles = articles.slice(0, 6)
  const total = displayArticles.length
  const [current, setCurrent] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pointerIdRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const reducedMotion = usePrefersReducedMotion()

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
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startAuto = useCallback(() => {
    stopAuto()
    if (total <= 1 || reducedMotion || isPaused) return
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % total)
    }, AUTOPLAY_MS)
  }, [total, stopAuto, reducedMotion, isPaused])

  useEffect(() => {
    startAuto()
    return () => stopAuto()
  }, [startAuto, stopAuto])

  // Pause when the tab isn't visible so we're not animating off-screen.
  useEffect(() => {
    const handleVisibility = () => setIsPaused(document.hidden)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerIdRef.current = e.pointerId
    stageRef.current?.setPointerCapture(e.pointerId)
    startXRef.current = e.clientX
    setIsDragging(true)
    stopAuto()
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || pointerIdRef.current !== e.pointerId) return
    setDragX(e.clientX - startXRef.current)
  }

  const endDrag = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return
    const stageWidth = stageRef.current?.offsetWidth || 320
    const threshold = stageWidth * SWIPE_FRACTION
    if (dragX < -threshold) goTo(current + 1)
    else if (dragX > threshold) goTo(current - 1)
    setIsDragging(false)
    setDragX(0)
    pointerIdRef.current = null
    startAuto()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      stopAuto()
      goTo(current - 1)
      startAuto()
    } else if (e.key === 'ArrowRight') {
      stopAuto()
      goTo(current + 1)
      startAuto()
    }
  }

  if (total === 0) return null

  const activeTitle = displayArticles[current]?.title ?? ''

  return (
    <div className="md:hidden">
      {/* Progress bar */}
      <div className="h-0.5 bg-gray-200 mx-4 rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-slate-900 rounded-full transition-all duration-400"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Screen-reader announcement of the active slide */}
      <span className="sr-only" role="status" aria-live="polite">
        {`স্লাইড ${current + 1} এর ${total}: ${activeTitle}`}
      </span>

      {/* Stage */}
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="carousel"
        tabIndex={total > 1 ? 0 : -1}
        onKeyDown={handleKeyDown}
        className="relative h-[220px] flex items-center justify-center overflow-hidden touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-xl"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Edge fades so off-stage cards feel like they recede rather than clip */}
        <div className="hidden pointer-events-none absolute inset-y-0 left-0 w-10 z-40 bg-gradient-to-r from-background to-transparent" />
        <div className="hidden pointer-events-none absolute inset-y-0 right-0 w-10 z-40 bg-gradient-to-l from-background to-transparent" />

        {displayArticles.map((article, i) => {
          const p = getPos(i)
          const isFocused = p.z === 30
          // While dragging, every visible card pans with the finger for a 1:1 feel;
          // on release it snaps back into its resting position.
          const liveX = isDragging ? p.x + dragX : p.x
          return (
            <div
              key={article.id}
              onClick={() => {
                if (i !== current) {
                  stopAuto()
                  goTo(i)
                  startAuto()
                }
              }}
              style={{
                transform: `translateX(${liveX}px) scale(${p.scale})`,
                opacity: p.opacity,
                zIndex: p.z,
                boxShadow: p.shadow,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.4s ease, box-shadow 0.4s ease',
                pointerEvents: p.opacity === 0 ? 'none' : 'auto',
              }}
              className="absolute h-full rounded-xl w-80 overflow-hidden bg-background cursor-pointer"
              aria-hidden={!isFocused}
            >
              <NewsCard article={article} variant="featured" className="h-full" />
            </div>
          )
        })}
      </div>

      {/* Nav row */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-5 py-3">
          <button
            onClick={() => {
              stopAuto()
              goTo(current - 1)
              startAuto()
            }}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            aria-label="Previous slide"
          >
            <span className="block w-2 h-2 border-r border-b border-gray-500 rotate-[135deg] translate-x-px" />
          </button>

          {/* Dot indicators give an at-a-glance sense of position for small totals */}
          <div className="flex items-center gap-1.5">
            {displayArticles.map((article, i) => (
              <button
                key={article.id}
                onClick={() => {
                  stopAuto()
                  goTo(i)
                  startAuto()
                }}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === current}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'w-4 h-1.5 bg-slate-900' : 'w-1.5 h-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => {
              stopAuto()
              goTo(current + 1)
              startAuto()
            }}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-slate-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            aria-label="Next slide"
          >
            <span className="block w-2 h-2 border-r border-b border-gray-500 -rotate-45 -translate-x-px" />
          </button>
        </div>
      )}
    </div>
  )
}

interface DynamicSection {
  id: number
  title: string
  type: string
  layout: string
  articles: NewsArticle[]
}

interface HomeClientProps {
  sections: DynamicSection[]
}

export default function HomeClient({ sections = [] }: HomeClientProps) {
  const NAV_LINKS = [
    { href: '/', label: 'Home', icon: House },
    { href: '/category/World', label: 'World', icon: Globe },
    { href: '/category/Technology', label: 'Technology', icon: Cpu },
    { href: '/category/Business', label: 'Business', icon: Briefcase },
    { href: '/category/Sports', label: 'Sports', icon: Trophy },
    { href: '/category/Science', label: 'Science', icon: Flask },
    { href: '/category/Health', label: 'Health', icon: Pulse },
    { href: '/category/Opinion', label: 'Opinion', badge: 'New', icon: ChatTeardropText },
  ]
  const pathname = usePathname()
  const { data: session } = useSession()
  const locale = pathname.split('/')[1] || 'bn'
  const hasArticles = sections && sections.some(s => s.articles && s.articles.length > 0)

  return (
    <div className="flex flex-col items-start justify-between gap-2 w-full h-auto">


      <main className="flex-grow w-full">
        {!hasArticles && (
          <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Sparkle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">কোনো প্রকাশিত নিবন্ধ পাওয়া যায়নি</h2>
            <p className="text-slate-500 max-w-md">নিবন্ধ দেখতে অনুগ্রহ করে প্রথমে ড্যাশবোর্ড থেকে বা "Write" পেজে গিয়ে নতুন নিবন্ধ তৈরি করুন এবং সেটি পাবলিশ করুন।</p>
            <Link
              href={`/${locale}/write`}
              className="mt-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              নতুন নিবন্ধ লিখুন
            </Link>
          </div>
        )}

        {sections.map((section, idx) => {
          if (!section.articles || section.articles.length === 0) return null

          // Rendering standard grid layout
          if (section.layout === 'grid') {
            const [mostRecent, second, third, fourth, ...others] = section.articles;

            return (
              <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                </div>

                <CoverFlowSlider articles={section.articles} />

                {/* If we have at least 4 articles, render the beautiful customized grid */}
                {section.articles.length >= 4 ? (
                  <div
                    className="hidden md:grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-12"
                    style={{ gridTemplateRows: 'repeat(2, minmax(260px, auto))' }}
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
                ) : (
                  <div className="hidden md:grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {section.articles.map((article) => (
                      <NewsCard key={article.id} article={article} variant="default" />
                    ))}
                  </div>
                )}
              </section>
            )
          }

          // Rendering list layout
          if (section.layout === 'list') {
            return (
              <section key={section.id} className="py-12 pt-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b">
                        <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                      </div>

                      <div className="space-y-6">
                        {section.articles.map((article) => (
                          <NewsCard
                            key={article.id ?? 'null'}
                            article={article}
                            variant="horizontal"
                            className="my-2"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )
          }

          // Rendering slider layout
          if (section.layout === 'slider') {
            return (
              <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                </div>

                <CoverFlowSlider articles={section.articles} />

                <div className="hidden md:grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {section.articles.map((article) => (
                    <NewsCard key={article.id} article={article} variant="default" />
                  ))}
                </div>
              </section>
            )
          }

          return null
        })}
      </main>
    </div>
  )
}