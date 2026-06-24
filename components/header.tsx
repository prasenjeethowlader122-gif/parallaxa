'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { NewsArticle, getBreakingNews, getTrendingArticles } from '@/lib/db/articles'
import { Fugaz, sansFont } from '@/lib/font'
import {
  Home, Globe, Cpu, Briefcase, Trophy, FlaskConical, Activity, MessageSquare,
  X, Languages, ChevronDown, Search, Bell, FileEdit, Menu, LayoutDashboard
} from 'lucide-react'

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
  const locale = pathname.split('/')[1] || 'en'

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAnnVisible, setIsAnnVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [desktopQuery, setDesktopQuery] = useState('')
  const [searchCategory, setSearchCategory] = useState('All')
  const [isCatOpen, setIsCatOpen] = useState(false)
  const [tickerArticles, setTickerArticles] = useState<NewsArticle[]>([])
  const [trendingArticles, setTrendingArticles] = useState<NewsArticle[]>([])
  const catRef = useRef<HTMLDivElement>(null)

  const SEARCH_CATEGORIES = ['All', 'World', 'Technology', 'Business', 'Sports']

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
    await signOut({ redirect: true, redirectUrl: '/' })
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    // KEY FIX: removed backdrop-blur-md from the header itself.
    // backdrop-blur (and filter/transform) create a new containing block,
    // which breaks fixed/absolute child positioning. Use solid bg instead.
    <header className={`sticky top-0 z-50 bg-background ${className ?? ''}`}>

      {/* ── ANNOUNCEMENT BAR ── */}
      {isAnnVisible && (
        <div className="bg-red-600 text-primary-foreground text-xs font-medium tracking-wide flex items-center justify-center gap-2 px-4 py-1.5 relative">
          <span className="inline-block w-1.5 h-1.5 bg-background rounded-full animate-pulse flex-shrink-0" />
          <span>Breaking: Fed holds interest rates steady for third consecutive meeting —</span>
          <Link href="/category/Business" className="underline underline-offset-2 opacity-80 hover:opacity-100 whitespace-nowrap">
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
      <div className="hidden md:block bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-xs text-muted-foreground">{today}</span>
            <div className="flex items-center gap-4">
              {['Newsletter', 'Podcast', 'E-paper'].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-2.5 py-0.5 hover:bg-background uppercase">
              <Languages className="w-3.5 h-3.5" />
              {(pathname.split('/')[1] || 'en').toUpperCase()}
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-xl shadow-xl p-1 w-24 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              {['en', 'es', 'fr', 'de', 'ja'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    const parts = pathname.split('/')
                    parts[1] = lang
                    router.push(parts.join('/') || `/${lang}`)
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-card rounded-lg transition-colors uppercase"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BRAND ROW (desktop) ── */}
      <div className="hidden md:block bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 select-none">
            <div className="flex flex-col leading-none">
              <span className="text-[24px] font-extrabold text-foreground tracking-tight uppercase">
                বাংলাদেশ হিন্দু ইউনিয়ন
              </span>
            </div>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleDesktopSearch}
            className="flex-1 max-w-md flex items-center border border-border rounded-xl overflow-hidden bg-card focus-within:bg-background focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all"
          >
            <div className="relative flex-shrink-0" ref={catRef}>
              <button
                type="button"
                onClick={() => setIsCatOpen(!isCatOpen)}
                className="flex items-center gap-1.5 px-3 h-10 text-xs text-muted-foreground border-r border-border hover:bg-gray-100 transition-colors"
              >
                {searchCategory}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isCatOpen && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[120px]">
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setSearchCategory(cat); setIsCatOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        searchCategory === cat
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-card'
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
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-foreground placeholder-gray-400 min-w-0"
            />
            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-gray-700 transition-colors flex-shrink-0"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="relative w-9 h-9 flex items-center justify-center border border-border rounded-lg text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
            </button>

            {session?.user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold hover:ring-2 hover:ring-gray-300 transition-all">
                    {session.user.name?.charAt(0).toUpperCase() ?? session.user.email?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DESKTOP NAV ROW ── */}
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

      {/* ── TICKER ── */}
      {includeTicker && tickerArticles.length > 0 && (
        <div className="bg-card border-b border-border h-8 flex items-center overflow-hidden">
          <div className="flex items-center gap-1.5 px-4 h-full bg-primary text-primary-foreground flex-shrink-0">
            <span className="inline-block w-1.5 h-1.5 bg-background rounded-full animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">Breaking</span>
          </div>
          <div className="overflow-hidden flex-1 flex items-center">
            <div className="flex animate-[ticker_32s_linear_infinite] whitespace-nowrap">
              {[...tickerArticles, ...tickerArticles].map((article, i) => (
                <span key={i} className="text-[11px] text-muted-foreground px-7 border-r border-border last:border-r-0">
                  <span className="font-semibold text-gray-800">
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
      <div className="md:hidden bg-background border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between gap-3">

          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3 select-none">
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false) }}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-card rounded-lg transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-[18px] font-extrabold text-foreground tracking-tight uppercase">
                বাংলাদেশ হিন্দু ইউনিয়ন
              </span>
            </Link>
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false) }}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-card rounded-lg transition-colors"
              aria-label="Search"
            >
              {isSearchOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
            </button>
            <button className="relative w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-card rounded-lg transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {isSearchOpen && (
          <div className="px-4 pb-3 border-t border-border pt-2">
            <form onSubmit={handleSearch} className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-card focus-within:bg-background focus-within:border-gray-400 transition-all">
              <input
                type="text"
                placeholder="Search stories, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-foreground placeholder-gray-400"
                autoFocus
              />
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── MOBILE MENU ── */}
      {/* KEY FIX: changed from `fixed inset-0 top-14` to `absolute left-0 right-0 top-full`.
          The header's backdrop-blur-md (now removed) was creating a new containing block,
          trapping fixed children inside it. absolute+top-full anchors cleanly to the
          bottom of the header without fighting stacking contexts. */}
      {isMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full z-50 bg-background flex flex-col overflow-y-auto max-h-[calc(100svh-3.5rem)] shadow-xl">

          {/* Search */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Quick search</p>
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
              <Search className="w-4.5 h-4.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Search stories, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder-gray-400"
              />
            </form>
          </div>

          {/* Sections grid */}
          <div className="px-5 pt-5">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">Sections</p>
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {NAV_LINKS.map(({ href, label, badge, icon: Icon }) => {
                const localizedHref = `/${locale}${href === '/' ? '' : href}`
                const isActive = pathname === localizedHref
                return (
                  <Link
                    key={href}
                    href={localizedHref}
                    onClick={() => setIsMenuOpen(false)}
                    className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-colors ${
                      isActive
                        ? 'bg-primary border-gray-900'
                        : 'bg-card border-border hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isActive ? 'bg-background/15' : 'bg-background border border-border'}`}>
                      {Icon && (
                        <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary-foreground' : 'text-gray-600'}`} />
                      )}
                    </div>
                    <span className={`text-xs font-medium leading-tight ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {label}
                    </span>
                    {badge && (
                      <span className="absolute top-2 right-2 text-[8px] font-medium uppercase tracking-wide bg-red-50 text-red-600 rounded px-1 py-0.5">
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
                    onClick={() => setIsMenuOpen(false)}
                    className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-colors ${
                      pathname === `/${locale}/write`
                        ? 'bg-primary border-gray-900'
                        : 'bg-card border-border hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${pathname === `/${locale}/write` ? 'bg-background/15' : 'bg-background border border-border'}`}>
                      <FileEdit className={`w-4.5 h-4.5 ${pathname === `/${locale}/write` ? 'text-primary-foreground' : 'text-gray-600'}`} />
                    </div>
                    <span className={`text-xs font-medium leading-tight ${pathname === `/${locale}/write` ? 'text-primary-foreground' : 'text-foreground'}`}>
                      Write
                    </span>
                  </Link>
                  <Link
                    href={`/${locale}/dashboard`}
                    onClick={() => setIsMenuOpen(false)}
                    className={`relative flex flex-col gap-1.5 p-3.5 rounded-xl border transition-colors ${
                      pathname === `/${locale}/dashboard`
                        ? 'bg-primary border-gray-900'
                        : 'bg-card border-border hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${pathname === `/${locale}/dashboard` ? 'bg-background/15' : 'bg-background border border-border'}`}>
                      <LayoutDashboard className={`w-4.5 h-4.5 ${pathname === `/${locale}/dashboard` ? 'text-primary-foreground' : 'text-gray-600'}`} />
                    </div>
                    <span className={`text-xs font-medium leading-tight ${pathname === `/${locale}/dashboard` ? 'text-primary-foreground' : 'text-foreground'}`}>
                      Dashboard
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Trending */}
          {trendingArticles.length > 0 && (
            <div className="px-5 border-t border-border">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mt-4 mb-3">Trending now</p>
              <div className="flex flex-col gap-3 mb-6">
                {trendingArticles.slice(0, 3).map((article, idx) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex gap-3 group"
                  >
                    <span className="text-xl font-bold text-gray-200 group-hover:text-red-600 transition-colors">
                      0{idx + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {article.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Auth — pinned to bottom */}
          <div className="mt-auto px-5 pb-8 pt-4 border-t border-border flex gap-2.5">
            {session?.user ? (
              <button
                onClick={() => { handleSignOut(); setIsMenuOpen(false) }}
                className="flex-1 h-11 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-card transition-colors"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 h-11 flex items-center justify-center text-sm font-medium text-foreground border border-gray-300 rounded-xl hover:bg-card transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 h-11 flex items-center justify-center text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:bg-gray-700 transition-colors"
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