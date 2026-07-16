'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'

import { NewsArticle, getBreakingNews, getTrendingArticles } from '@/lib/db/articles'
import {
  House,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  Flask,
  Pulse,
  ChatTeardropText,
  X,
  Translate,
  CaretDown,
  MagnifyingGlass,
  Bell,
  NotePencil,
  List,
  Stack,
} from '@phosphor-icons/react'
import { sansFont, serifFont, monoFont, banglaFontlogo, banglaFont } from '@/lib/font'

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

const ICON_MAP: Record<string, any> = {
  Home: House,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  FlaskConical: Flask,
  Activity: Pulse,
  MessageSquare: ChatTeardropText
}

function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return svg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*(['"])(.*?)\1/gi, '')
    .replace(/javascript\s*:/gi, '');
}

export function Header({
  includeTicker = false,
  className,
}: {
  includeTicker?: boolean
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const locale = pathname.split('/')[1] || 'bn'

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [navLinks, setNavLinks] = useState<any[]>(NAV_LINKS)
  const [isAnnVisible, setIsAnnVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [desktopQuery, setDesktopQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('All')
  const [isCatOpen, setIsCatOpen] = useState(false)
  const [tickerArticles, setTickerArticles] = useState<NewsArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([])
  const catRef = useRef<HTMLDivElement>(null)

  const SEARCH_CATEGORIES = ['All', 'World', 'Technology', 'Business', 'Sports']

  useEffect(() => {
    async function loadMobileMenu() {
      try {
        const res = await fetch('/api/public-settings')
        if (res.ok) {
          const data = await res.json()
          if (data.mobile_menu_links) {
            const parsed = JSON.parse(data.mobile_menu_links)
            if (Array.isArray(parsed)) {
              const mapped = parsed.map(link => ({
                href: link.href,
                label: link.label,
                badge: link.badge || undefined,
                icon: ICON_MAP[link.iconName] || House,
                iconName: link.iconName || 'Home',
                iconUrl: link.iconUrl || undefined
              }))
              setNavLinks(mapped)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load mobile settings:', err)
      }
    }
    loadMobileMenu()
  }, [])

  // Close category dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setIsCatOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load breaking news ticker and trending
  useEffect(() => {
    async function loadData() {
      try {
        const [breaking, trending] = await Promise.all([
          getBreakingNews(),
          getTrendingArticles(),
        ])
        setTickerArticles(breaking)
        setTrendingArticles(trending)
      } catch (error) {
        console.error('Failed to load header data:', error)
      }
    }
    loadData()
  }, [])

  // Close mobile overlays on route change
  useEffect(() => {
    setIsMenuOpen(false)
    setIsSearchOpen(false)
  }, [pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setIsSearchOpen(false)
    }
  }

  const handleDesktopSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (desktopQuery.trim()) {
      const cat = searchCategory !== 'All' ? `&category=${searchCategory}` : ''
      router.push(`/search?q=${encodeURIComponent(desktopQuery.trim())}${cat}`)
      setDesktopQuery('')
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectTo: '/' })
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className={`sticky top-0 z-50 bg-white border-b border-slate-200/50 ${className ?? ''}`}>
      {/* ── ANNOUNCEMENT BAR ── */}
      {isAnnVisible && (
        <div className="bg-red-600 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 px-4 py-1.5 relative">
          <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0" />
          <span>Breaking: Fed holds interest rates steady for third consecutive meeting —</span>
          <Link
            href="/category/Business"
            className="underline underline-offset-2 opacity-80 hover:opacity-100 whitespace-nowrap"
          >
            Read full story
          </Link>
          <button
            onClick={() => setIsAnnVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── UTILITY ROW (desktop only) ── */}
      <div className="hidden md:block bg-slate-50 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-xs text-slate-500">{today}</span>
            <div className="flex items-center gap-4">
              {['Newsletter', 'Podcast', 'E-paper'].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors border border-slate-200 rounded-full px-2.5 py-0.5 hover:bg-white uppercase font-medium">
              <Translate className="w-3.5 h-3.5" />
              {(pathname.split('/')[1] || 'bn').toUpperCase()}
              <CaretDown className="w-3 h-3" />
            </button>
            <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-xl p-1 w-24 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {['en', 'es', 'fr', 'de', 'ja'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    const parts = pathname.split('/')
                    parts[1] = lang
                    router.push(parts.join('/') || `/${lang}`)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors uppercase"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BRAND ROW (desktop) ── */}
      <div className="hidden md:block bg-white border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Text Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 select-none h-full">
            <div className="flex flex-col leading-none h-full justify-center">
              <h1 className={`${banglaFontlogo.className} text-2xl md:text-3xl font-[900] text-slate-900`}>
                অনলি্হিন্দু™
              </h1>
            </div>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleDesktopSearch}
            className="flex-1 max-w-md flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-slate-400 transition-all"
          >
            <div className="relative flex-shrink-0" ref={catRef}>
              <button
                type="button"
                onClick={() => setIsCatOpen(!isCatOpen)}
                className="flex items-center gap-1.5 px-3 h-10 text-xs text-slate-500 border-r border-slate-200 hover:bg-slate-100 transition-colors"
              >
                {searchCategory}
                <CaretDown className="w-3.5 h-3.5" />
              </button>
              {isCatOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg overflow-hidden z-50 min-w-[120px]">
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSearchCategory(cat)
                        setIsCatOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        searchCategory === cat
                          ? 'bg-slate-900 text-white font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Search stories, topics, people…"
              value={desktopQuery}
              onChange={(e) => setDesktopQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-slate-900 placeholder-slate-400 min-w-0"
            />
            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white hover:bg-slate-800 transition-colors flex-shrink-0"
              aria-label="Search"
            >
              <MagnifyingGlass className="w-5 h-5" />
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="relative w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
            </button>

            {session?.user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold hover:ring-2 hover:ring-slate-300 transition-all uppercase">
                    {session.user.name?.charAt(0).toUpperCase() ??
                      session.user.email?.charAt(0).toUpperCase() ??
                      'U'}
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP NAV ROW ── */}
      <div className="hidden md:block bg-white">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, badge, icon: Icon, iconUrl }) => {
              const localizedHref = `/${locale}${href === '/' ? '' : href}`
              const isActive = pathname === localizedHref
              return (
                <Link
                  key={href}
                  href={localizedHref}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {iconUrl ? (
                    iconUrl.trim().startsWith('<svg') ? (
                      <span
                        className="w-4 h-4 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:object-contain"
                        dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconUrl) }}
                      />
                    ) : (
                      <img
                        src={iconUrl}
                        alt=""
                        className="w-4 h-4 object-contain shrink-0"
                      />
                    )
                  ) : Icon ? (
                    <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                  ) : null}
                  <span>{label}</span>
                  {badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      {badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── TICKER ── */}
      {includeTicker && tickerArticles.length > 0 && (
        <div className="bg-slate-50 border-t border-b border-slate-200/50 h-8 flex items-center overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 h-full bg-slate-900 text-white flex-shrink-0">
            <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              Breaking
            </span>
          </div>
          <div className="overflow-hidden flex-1 flex items-center">
            <div className="flex animate-[ticker_32s_linear_infinite] whitespace-nowrap">
              {[...tickerArticles, ...tickerArticles].map((article, i) => (
                <span
                  key={i}
                  className="text-[11px] text-slate-500 px-7 border-r border-slate-200 last:border-r-0"
                >
                  <span className="font-semibold text-slate-800">
                    {article.category ?? 'Breaking'}:
                  </span>{' '}
                  {article.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE TOP BAR ── */}
      <div className="md:hidden">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          {/* Left: logo */}
          <div className="flex items-center justify-start gap-3 select-none h-full">
            <button
              onClick={() => {
                setIsMenuOpen((prev) => !prev)
                setIsSearchOpen(false)
              }}
              className="p-2 -ml-2 text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <List className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 select-none h-full">
              <div className="flex flex-col leading-none h-full justify-center">
                <h1 className={`${banglaFontlogo.className} text-2xl font-[900]`}>অনলি্হিন্দু™</h1>
              </div>
            </Link>
          </div>

          {/* Right: search */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsSearchOpen(!isSearchOpen)
                setIsMenuOpen(false)
              }}
              className="w-9 h-9 flex items-center justify-center text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Search"
            >
              {isSearchOpen ? <X className="w-6 h-6" /> : <MagnifyingGlass className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {isSearchOpen && (
          <div className="px-4 pb-3 border-t border-slate-200/50 pt-2">
            <form
              onSubmit={handleSearch}
              className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 focus-within:bg-white focus-within:border-slate-400 transition-all"
            >
              <input
                type="text"
                placeholder="Search stories, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-slate-900 placeholder-slate-400"
                autoFocus
              />
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white flex-shrink-0"
                aria-label="Search"
              >
                <MagnifyingGlass className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── MOBILE MENU ── */}
      {isMenuOpen && (
        <div className="md:hidden relative bg-slate-50 flex flex-col overflow-y-auto max-h-[calc(100svh-3.5rem)] border-b border-slate-200">
          <div className="flex items-baseline justify-between px-5 pt-4 pb-3">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">
              Contents
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400">
              {today}
            </span>
          </div>
          <div className="h-px bg-slate-900 mx-5" />

          {/* Search */}
          <div className="px-5 pt-5 pb-6">
            <form onSubmit={handleSearch} className="flex items-end gap-2 border-b border-slate-400 pb-2">
              <MagnifyingGlass className="w-4 h-4 text-slate-400 flex-shrink-0 mb-0.5" />
              <input
                type="text"
                placeholder="Search stories, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent text-slate-900 placeholder-slate-400 font-sans"
              />
            </form>
          </div>

          {/* Sections */}
          <div className="px-5">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400 mb-1">
              Sections
            </p>
            <nav className="flex flex-col">
              {navLinks.map(({ href, label, badge, icon: Icon, iconUrl }, idx) => {
                const localizedHref = `/${locale}${href === '/' ? '' : href}`
                const isActive = pathname === localizedHref
                return (
                  <Link
                    key={href}
                    href={localizedHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="group relative flex items-center gap-3 py-3.5 border-b border-slate-200"
                  >
                    <span
                      className={`absolute -left-5 top-0 bottom-0 w-1 bg-red-700 transition-transform duration-200 origin-left ${
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      }`}
                    />
                    <span className="text-xs text-slate-400 w-6">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    {iconUrl ? (
                      iconUrl.trim().startsWith('<svg') ? (
                        <span
                          className="w-4 h-4 flex items-center justify-center shrink-0 [&>svg]:w-4 [&>svg]:h-4 [&>svg]:object-contain"
                          dangerouslySetInnerHTML={{ __html: sanitizeSvg(iconUrl) }}
                        />
                      ) : (
                        <img
                          src={iconUrl}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )
                    ) : Icon ? (
                      <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    ) : null}
                    <span
                      className={`flex-1 text-[17px] leading-tight ${
                        isActive ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {label}
                    </span>
                    {badge && (
                      <span className="text-[9px] font-mono uppercase tracking-widest text-red-700 border border-red-700 px-1.5 py-0.5">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            {session && (
              <div className="grid grid-cols-2 gap-px bg-slate-200 mt-3 mb-2 border-t border-slate-300">
                <Link
                  href={`/${locale}/write`}
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-white flex flex-col gap-2 p-4 hover:bg-slate-50 transition-colors"
                >
                  <NotePencil className="w-4 h-4 text-slate-700" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700">
                    Write
                  </span>
                </Link>
                <Link
                  href={`/${locale}/dashboard`}
                  onClick={() => setIsMenuOpen(false)}
                  className="bg-white flex flex-col gap-2 p-4 hover:bg-slate-50 transition-colors"
                >
                  <Stack className="w-4 h-4 text-slate-700" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-700">
                    Dashboard
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Trending */}
          {trendingArticles.length > 0 && (
            <div className="px-5 pt-5 border-t border-slate-200 mt-4">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400 mb-3">
                Trending now
              </p>
              <div className="flex flex-col">
                {trendingArticles.map((article, idx) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="group flex gap-3 py-3 border-b border-slate-200 last:border-b-0"
                  >
                    <span className="font-mono text-xs text-slate-400 mt-1 w-8 flex-shrink-0">
                      N&deg;{String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="font-serif text-[15px] text-slate-800 leading-snug group-hover:text-red-700 transition-colors">
                      {article.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Auth */}
          <div className="mt-auto px-5 py-5 border-t border-slate-200 flex gap-2.5">
            {session ? (
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMenuOpen(false)
                }}
                className="flex-1 h-11 text-sm font-semibold text-slate-700 border border-stone-300 hover:bg-slate-100 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 h-11 flex items-center justify-center text-sm font-semibold text-slate-900 border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 h-11 flex items-center justify-center text-sm font-semibold text-white bg-red-700 hover:bg-red-800 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
