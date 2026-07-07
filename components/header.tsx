'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { NewsArticle, getBreakingNews, getTrendingArticles } from '@/lib/db/articles'
import {
  House,
  Globe,
  Cpu,
  Briefcase,
  SoccerBall,
  Flask,
  FirstAid,
  ChatCircleDots,
  X,
  Envelope,
  Broadcast,
  Newspaper,
  CaretDown,
  MagnifyingGlass,
  PencilSimple,
  SquaresFour,
  Rss,
  List,
  SignIn,
  SignOut,
  UserPlus
} from '@phosphor-icons/react/ssr'

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: House },
  { href: '/category/World', label: 'World', icon: Globe },
  { href: '/category/Technology', label: 'Technology', icon: Cpu },
  { href: '/category/Business', label: 'Business', icon: Briefcase },
  { href: '/category/Sports', label: 'Sports', icon: SoccerBall },
  { href: '/category/Science', label: 'Science', icon: Flask },
  { href: '/category/Health', label: 'Health', icon: FirstAid },
  { href: '/category/Opinion', label: 'Opinion', badge: 'New', icon: ChatCircleDots },
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
  const locale = pathname.split('/')[1] || 'bn'

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
    <header className={`sticky top-0 z-50 bg-background border-b border-border ${className ?? ''}`}>
      {/* ── ANNOUNCEMENT BAR ── */}
      {isAnnVisible && (
        <div className="bg-red-600 text-primary-foreground text-xs font-medium tracking-wide flex items-center justify-center gap-2 px-4 py-1.5 relative">
          <span className="inline-block w-1.5 h-1.5 bg-background rounded-full animate-pulse flex-shrink-0" />
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
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── UTILITY ROW (desktop only) ── */}
      <div className="hidden md:block bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-xs text-muted-foreground">{today}</span>
            <div className="flex items-center gap-4">
              {[
                { label: 'Newsletter', icon: Envelope },
                { label: 'Podcast', icon: Broadcast },
                { label: 'E-paper', icon: Newspaper }
              ].map((item) => (
                <Link
                  key={item.label}
                  href="#"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-full px-2.5 py-0.5 hover:bg-background uppercase">
              <Globe size={16} />
              {(pathname.split('/')[1] || 'bn').toUpperCase()}
              <CaretDown size={12} />
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
          <div className="flex items-center gap-8">
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 select-none">
              <span className="font-logo text-2xl font-bold text-red-600 tracking-tight">Only Hindu</span>
            </Link>

            {/* Center-ish: Search */}
            <form
              onSubmit={handleDesktopSearch}
              className="flex items-center border border-border rounded-xl overflow-hidden bg-card focus-within:bg-background focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all w-80"
            >
            <div className="relative flex-shrink-0" ref={catRef}>
              <button
                type="button"
                onClick={() => setIsCatOpen(!isCatOpen)}
                className="flex items-center gap-1.5 px-3 h-10 text-xs text-muted-foreground border-r border-border hover:bg-gray-100 transition-colors"
              >
                {searchCategory}
                <CaretDown size={12} />
              </button>
              {isCatOpen && (
                <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 min-w-[120px]">
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
                placeholder="Search..."
                value={desktopQuery}
                onChange={(e) => setDesktopQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-foreground placeholder-gray-400 min-w-0"
              />
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground hover:bg-gray-700 transition-colors flex-shrink-0"
                aria-label="Search"
              >
                <MagnifyingGlass size={20} />
              </button>
            </form>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {session?.user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold overflow-hidden">
                    {session.user.image ? (
                      <Image src={session.user.image} alt={session.user.name ?? ''} width={32} height={32} />
                    ) : (
                      session.user.name?.charAt(0).toUpperCase() ?? 'U'
                    )}
                  </div>
                  <span className="hidden lg:inline">{session.user.name}</span>
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
            {NAV_LINKS.map(({ href, label, badge, icon: Icon }) => {
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
                    <Icon size={20} />
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
                  <PencilSimple size={20} />
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
                  <SquaresFour size={20} />
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
            <Rss size={12} className="animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">
              Breaking
            </span>
          </div>
          <div className="overflow-hidden flex-1 flex items-center">
            <div className="flex animate-[ticker_32s_linear_infinite] whitespace-nowrap">
              {[...tickerArticles, ...tickerArticles].map((article, i) => (
                <span
                  key={i}
                  className="text-[11px] text-muted-foreground px-7 border-r border-border last:border-r-0"
                >
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
      <div className="md:hidden bg-background">
        <div className="px-4 h-14 flex items-center justify-between gap-3">
          {/* Left: menu toggle */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-card rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <List size={24} />
          </button>

          {/* Center: Logo */}
          <Link href="/" className="flex items-center select-none h-full">
            <span className="font-logo text-xl font-bold text-red-600 tracking-tight">Only Hindu</span>
          </Link>

          {/* Right: search */}
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen)
              setIsMenuOpen(false)
            }}
            className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-card rounded-lg transition-colors"
            aria-label="Search"
          >
            {isSearchOpen ? <X size={24} /> : <MagnifyingGlass size={24} />}
          </button>
        </div>

        {/* Mobile search bar */}
        {isSearchOpen && (
          <div className="px-4 pb-3 border-t border-border pt-2">
            <form
              onSubmit={handleSearch}
              className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-card focus-within:bg-background focus-within:border-gray-400 transition-all"
            >
              <input
                type="text"
                placeholder="Search..."
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
                <MagnifyingGlass size={20} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── MOBILE MENU ── */}
      {isMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-0 z-[100] h-screen bg-background flex flex-col shadow-xl overflow-hidden">
          <div className="px-4 h-14 flex items-center justify-between border-b border-border">
            <span className="font-bold text-lg">Menu</span>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 text-gray-600 hover:bg-card rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Quick search */}
            <div className="px-5 py-4 border-b border-border">
              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-11"
              >
                <MagnifyingGlass size={20} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm outline-none bg-transparent text-foreground placeholder-gray-400"
                />
              </form>
            </div>

            {/* Sections grid */}
            <div className="px-5 py-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {NAV_LINKS.map(({ href, label, badge, icon: Icon }) => {
                  const localizedHref = `/${locale}${href === '/' ? '' : href}`
                  const isActive = pathname === localizedHref
                  return (
                    <Link
                      key={href}
                      href={localizedHref}
                      onClick={() => setIsMenuOpen(false)}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-gray-900 shadow-md'
                          : 'bg-card border-border hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-sm font-medium">{label}</span>
                      {badge && (
                        <span className="absolute top-2 right-2 text-[8px] font-medium uppercase tracking-wide bg-red-50 text-red-600 rounded px-1 py-0.5">
                          {badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* User account */}
            <div className="px-5 py-4 border-t border-border">
               <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                Account
              </p>
              <div className="flex flex-col gap-2">
                {session ? (
                  <>
                    <Link
                      href={`/${locale}/dashboard`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-gray-100 transition-colors"
                    >
                      <SquaresFour size={20} />
                      <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                    <Link
                      href={`/${locale}/write`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-gray-100 transition-colors"
                    >
                      <PencilSimple size={20} />
                      <span className="text-sm font-medium">Write</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors w-full"
                    >
                      <SignOut size={20} />
                      <span className="text-sm font-medium">Sign out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-gray-100 transition-colors"
                    >
                      <SignIn size={20} />
                      <span className="text-sm font-medium">Sign in</span>
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-primary text-primary-foreground hover:bg-gray-800 transition-colors"
                    >
                      <UserPlus size={20} />
                      <span className="text-sm font-medium">Get started</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
