'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

import { useState, useEffect, useRef, useCallback } from 'react'
import { NewsCard } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'
import {
  Home,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  FlaskConical,
  Activity,
  MessageSquare,
  X,
  Languages,
  ChevronDown,
  Search,
  Bell,
  FileEdit,
  Menu,
  LayoutDashboard,
} from 'lucide-react'

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

interface HomeClientProps {
  initialLatest: NewsArticle[]
  initialWorld: NewsArticle[]
  initialTech: NewsArticle[]
}

export default function HomeClient({ initialLatest, initialWorld, initialTech }: HomeClientProps) {
  const [mostRecent, second, third, fourth] = initialLatest
  const NAV_LINKS = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/category/World', label: 'World', icon: Globe },
    { href: '/category/Technology', label: 'Technology', icon: Cpu },
    { href: '/category/Business', label: 'Business', icon: Briefcase },
    { href: '/category/Sports', label: 'Sports', icon: Trophy },
    { href: '/category/Science', label: 'Science', icon: FlaskConical },
    { href: '/category/Health', label: 'Health', icon: Activity },
    { href: '/category/Opinion', label: 'Opinion', badge: 'New', icon: MessageSquare },
  ]
  const pathname = usePathname()
  const { data: session } = useSession()
  const locale = pathname.split('/')[1] || 'bn'
  
  return (
    <div className = 'flex flex-row items-start justify-between gap-2 w-full h-auto'>
            <div className="hidden md:block bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {NAV_LINKS.map(({ href, label, badge }) => {
              const localizedHref = `/${locale}${href === '/' ? '' : href}`
              const isActive = pathname === localizedHref
              return (
                <Link
                  key={href}
                  href={localizedHref}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-foreground after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-red-600 after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                  {badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide bg-red-50 text-red-600">
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}

            {session && (
              <>
                <Link
                  href={`/${locale}/write`}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    pathname === `/${locale}/write`
                      ? 'text-foreground after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-red-600 after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileEdit className="w-4.5 h-4.5" />
                  Write
                </Link>
                <Link
                  href={`/${locale}/dashboard`}
                  className={`relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    pathname === `/${locale}/dashboard`
                      ? 'text-foreground after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-red-600 after:rounded-full'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dashboard
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    <main className="flex-grow">
      {/* Top Stories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Top Stories</h2>
          <span className="md:hidden text-sm text-blue-600 cursor-pointer">See all</span>
        </div>

        <CoverFlowSlider articles={initialLatest} />

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
      </section>

      {/* World News */}
      <section className="py-12 pt-4 -mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-accent">
                <h2 className="text-2xl font-bold text-foreground">World</h2>
                <span className="md:hidden text-sm text-blue-600 cursor-pointer">See all</span>
              </div>

              <div className="space-y-6">
                {initialWorld.map((article) => (
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

      {/* Technology News */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-accent">
                <h2 className="text-2xl font-bold text-foreground">Tech</h2>
                <span className="md:hidden text-sm text-blue-600 cursor-pointer">See all</span>
              </div>

              <div className="space-y-6">
                {initialTech.map((article) => (
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
    </main>
    </div>
  )
}