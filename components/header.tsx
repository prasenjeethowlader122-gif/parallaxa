'use client'

import Image from 'next/image'
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
  const [desktopQuery, setDesktopQuery] = useState('')
  
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
      router.push(`/search?q=${encodeURIComponent(desktopQuery.trim())}`)
      setDesktopQuery('')
    }
  }
  
  const handleSignOut = async () => {
    await signOut({ redirect: true, redirectUrl: '/' })
  }
  
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className='flex items-center justify-start gap-4 '>
                    <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="text-2xl font-bold text-black tracking-tight">
              <Image src={profilePic} alt="logo" height={40} />
            </div>
          </Link>
</div>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Home
            </Link>
            <Link href="/category/Technology" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Technology
            </Link>
            <Link href="/category/Business" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Business
            </Link>
            <Link href="/category/Sports" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Sports
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">

            {/* Mobile search toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>

            {/* Desktop search */}
            <form
              onSubmit={handleDesktopSearch}
              className="hidden md:flex items-center border border-gray-200 rounded-lg overflow-hidden"
            >
              <input
                type="text"
                placeholder="Search any news..."
                value={desktopQuery}
                onChange={(e) => setDesktopQuery(e.target.value)}
                className="pl-3 pr-1 py-1.5 text-sm outline-none bg-transparent w-44"
              />
              <button
                type="submit"
                className="p-2 text-black hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Auth */}
            {session?.user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
                    {session.user.name?.charAt(0).toUpperCase() ?? session.user.email?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                </Link>


              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="hidden sm:inline-block px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile menu toggle */}
            
          </div>
        </div>
        <button className='md:hidden px-4 py-2 border-2 border-gray-100 text-black rounded-full font-medium hover:bg-gray-800 transition-colors text-sm'>
          <Languages className='w-5 h-5'/>
        </button>
        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="pb-4 md:hidden">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 border-2 border-gray-100 text-black rounded-full font-medium hover:bg-gray-800 transition-colors text-sm"
              >
              <Search className='h-5 w-5'/>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-50 border-t border-gray-200">
          <nav className="flex flex-col gap-0">
            {[
              { href: '/', label: 'Home' },
              { href: '/category/Technology', label: 'Technology' },
              { href: '/category/Business', label: 'Business' },
              { href: '/category/Sports', label: 'Sports' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {label}
              </Link>
            ))}

            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleSignOut(); setIsMenuOpen(false) }}
                  className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors text-left border-t border-gray-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="px-6 py-3 text-sm font-bold text-red-600 hover:bg-gray-100 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}