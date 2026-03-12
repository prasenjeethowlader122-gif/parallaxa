'use client'
import Image from 'next/image';
import profilePic from '../public/New Project 20 [79DB18E].png'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, Menu, X } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'

export function Header() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
      setIsSearchOpen(false)
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectUrl: '/' })
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Top Bar - Logo and Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="text-2xl font-bold text-black tracking-tight">
              <Image src = {profilePic} alt='logo x' height='40'/>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Home
            </Link>
            <Link
              href="/category/Technology"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Technology
            </Link>
            <Link
              href="/category/Business"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Business
            </Link>
            <Link
              href="/category/Sports"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Sports
            </Link>
          </nav>

          {/* Right Side - Search and Auth */}
          <div className="flex items-center gap-4">
            {/* Search Icon */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>
            <div className='hidden  pl-2 text-sm rounded-l-lg md:flex items-center justify-between border-2 border-black'>
              <input type='text' placeholder='Search any news...' className='outline-none bg-none border-none flex-1'/>
              <button
              
              className="p-2  transition-colors bg-black rounded-r-lg text-white"
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
            </div>
            {/* Auth Section */}
            {session?.user ? (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-sm text-gray-700">{session.user.name}</span>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="hidden sm:inline-block px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="pb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-50 border-t border-gray-200">
          <nav className="flex flex-col gap-0">
            <Link
              href="/"
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/category/Technology"
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Technology
            </Link>
            <Link
              href="/category/Business"
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Business
            </Link>
            <Link
              href="/category/Sports"
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
              onClick={() => setIsMenuOpen(false)}
            >
              Sports
            </Link>
            {!session?.user && (
              <Link
                href="/auth/signin"
                className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
            {session?.user && (
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMenuOpen(false)
                }}
                className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors text-left border-t border-gray-200"
              >
                Sign Out
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
