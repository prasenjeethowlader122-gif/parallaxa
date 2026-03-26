'use client'

import Image from 'next/image'
import profilePic from '../public/New Project 25 [4D921DE].png'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Search, Menu, X, Languages, Bell, ChevronDown, TrendingUp, Bookmark, Radio } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { NewsArticle, getBreakingNews } from '@/lib/news-data'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/category/World', label: 'World' },
  { href: '/category/Technology', label: 'Technology' },
  { href: '/category/Business', label: 'Business' },
  { href: '/category/Sports', label: 'Sports' },
  { href: '/category/Science', label: 'Science' },
  { href: '/category/Health', label: 'Health' },
  { href: '/category/Opinion', label: 'Opinion', badge: 'New' },
]

export function Header({
  includeTinker = false
}) {
  const router = useRouter()
  const { data: session } = useSession()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAnnVisible, setIsAnnVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [desktopQuery, setDesktopQuery] = useState('')
  const [activeNav, setActiveNav] = useState('/')
  const [searchCategory, setSearchCategory] = useState('All')
  const [isCatOpen, setIsCatOpen] = useState(false)
  const [tickerArticles, setTickerArticles] = useState<NewsArticle[]>([])
  const catRef = useRef<HTMLDivElement>(null)

  const SEARCH_CATEGORIES = ['All', 'World', 'Technology', 'Business', 'Sports']

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setIsCatOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function loadTicker() {
      try {
        const articles = await getBreakingNews()
        setTickerArticles(articles)
      } catch (error) {
        console.error('Failed to load ticker articles:', error)
      }
    }
    loadTicker()
  }, [])

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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <header className="sticky top-0 z-50">

      {/* ── ANNOUNCEMENT BAR ── */}
      {isAnnVisible && (
        <div className="bg-red-600 text-white text-xs font-medium tracking-wide flex items-center justify-center gap-2 px-4 py-1.5 relative">
          <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span>Breaking: Fed holds interest rates steady for third consecutive meeting —</span>
          <Link href="/category/Business" className="underline underline-offset-2 opacity-80 hover:opacity-100">
            Read full story
          </Link>
          <button
            onClick={() => setIsAnnVisible(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity p-1"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── UTILITY ROW (desktop only) ── */}
      <div className="hidden md:block bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="text-xs text-gray-400">{today}</span>
            <div className="flex items-center gap-4">
              {['Newsletter', 'Podcast', 'E-paper'].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors border border-gray-200 rounded-full px-2.5 py-0.5 hover:bg-white">
            <Languages className="w-3 h-3" />
            EN
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* ── BRAND ROW (desktop) ── */}
      <div className="hidden md:block bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex items-center justify-center flex-shrink-0">
              <Image src={profilePic} alt="logo" height={30} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[19px] font-semibold text-gray-900 tracking-tight">
                Parallaxa<span className="text-red-600">.</span>
              </span>
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">Intelligence</span>
            </div>
          </Link>

          {/* Search */}
          <form
            onSubmit={handleDesktopSearch}
            className="flex-1 max-w-md flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100 transition-all"
          >
            {/* Category dropdown */}
            <div className="relative flex-shrink-0" ref={catRef}>
              <button
                type="button"
                onClick={() => setIsCatOpen(!isCatOpen)}
                className="flex items-center gap-1 px-3 h-10 text-xs text-gray-500 border-r border-gray-200 hover:bg-gray-100 transition-colors gap-1.5"
              >
                {searchCategory}
                <ChevronDown className="w-3 h-3" />
              </button>
              {isCatOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50 min-w-[120px]">
                  {SEARCH_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setSearchCategory(cat); setIsCatOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        searchCategory === cat
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-50'
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
              className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400 min-w-0"
            />
            <button
              type="submit"
              className="w-10 h-10 flex items-center justify-center bg-gray-900 text-white hover:bg-gray-700 transition-colors flex-shrink-0"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="relative w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
            </button>

            {session?.user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold hover:ring-2 hover:ring-gray-300 transition-all">
                    {session.user.name?.charAt(0).toUpperCase() ?? session.user.email?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ── TICKER ── */}
      <div className={`${!includeTinker &&  'hidden'} bg-gray-50 border-b border-gray-100 h-8 flex items-center overflow-hidden `}>
        <div className="flex items-center gap-1 px-4 h-full bg-black text-white flex-shrink-0">
          <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">Breaking</span>
        </div>
        <div className="sm:hidden overflow-hidden flex-1 flex items-center">
          {tickerArticles.length > 0 && (
            <div className="flex animate-[ticker_32s_linear_infinite] whitespace-nowrap">
              {[...tickerArticles, ...tickerArticles].map((article, i) => (
                <span key={i} className="text-[11px] text-gray-500 px-7 border-r border-gray-200">
                  <span className="font-semibold text-gray-800">
                    {article.category ?? 'Breaking'}:
                  </span>{' '}
                  {article.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE TOP BAR ── */}
      <div className="md:hidden bg-white border-b border-gray-100">
        <div className="px-4 h-14 flex items-center justify-between gap-3">

          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsMenuOpen(!isMenuOpen); setIsSearchOpen(false) }}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-4 h-4" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center">
                <Image src={profilePic} alt="logo" height={35} />
              </div>
              <span className="text-[17px] font-semibold text-gray-900 tracking-tight">
                Parallaxa<span className="text-red-600">.</span>
              </span>
            </Link>
          </div>

          {/* Right: search + bell */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false) }}
              className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
              aria-label="Search"
            >
              {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
            <button className="relative w-9 h-9 flex items-center justify-center  text-gray-600 hover:bg-gray-50 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white" />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {isSearchOpen && (
          <div className="px-4 pb-3 border-t border-gray-100 pt-2">
            <form onSubmit={handleSearch} className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <input
                type="text"
                placeholder="Search stories, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
                autoFocus
              />
              <button
                type="submit"
                className="w-10 h-10 flex items-center justify-center bg-gray-900 text-white flex-shrink-0"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── MOBILE MENU ── */}
      {isMenuOpen && (
        <div className="md:hidden bg-white w-full h-full">

          {/* Sections */}
          <div className="py-2 border-b border-gray-100">
            <p className="px-4 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Sections
            </p>
            {NAV_LINKS.map(({ href, label, badge }) => (
              <Link
                key={href}
                href={href}
                onClick={() => { setActiveNav(href); setIsMenuOpen(false) }}
                className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {label}
                  {badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide bg-red-50 text-red-600">
                      {badge}
                    </span>
                  )}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-300 -rotate-90" />
              </Link>
            ))}
          </div>

          {/* Trending */}
          <div className="py-2 border-b border-gray-100">
            <p className="px-4 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Trending now
            </p>
          </div>

          {/* Auth */}
          <div className="p-4">
            {session?.user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">
                    {session.user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{session.user.name ?? session.user.email}</span>
                </div>
                <button
                  onClick={() => { handleSignOut(); setIsMenuOpen(false) }}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-sm font-medium text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex-1 py-2.5 text-center text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}