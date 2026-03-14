'use client'

import Link from 'next/link'
import { categories } from '@/lib/news-data'
import { usePathname } from 'next/navigation'

export function CategoryFilter() {
  const pathname = usePathname()

  const isActive = (category: string) => {
    return pathname === `/category/${category}`
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 overflow-x-auto py-3 scrollbar-hide">
          <Link href="/">
            <button
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-black text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              All News
            </button>
          </Link>

          {categories.map((category) => (
            <Link key={category} href={`/category/${category}`}>
              <button
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(category)
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
