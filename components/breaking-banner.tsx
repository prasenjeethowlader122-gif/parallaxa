'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { NewsArticle, getBreakingNews } from '@//lib/news-data'
import { ChevronRight } from 'lucide-react'

export function BreakingBanner() {
  const [breakingArticles, setBreakingArticles] = useState<NewsArticle[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const articles = getBreakingNews()
    setBreakingArticles(articles)
  }, [])

  if (breakingArticles.length === 0) return null

  const currentArticle = breakingArticles[currentIndex]

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % breakingArticles.length)
  }

  return (
    <div className="bg-red-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href={`/article/${currentArticle.id}`}>
          <div className="flex items-center justify-between gap-4 py-3 cursor-pointer group">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0">
                <span className="inline-block bg-white text-red-600 px-2.5 py-1 rounded font-bold text-xs animate-pulse">
                  BREAKING
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold truncate group-hover:underline">
                {currentArticle.title}
              </h3>
            </div>
            <div className="flex-shrink-0">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </Link>

        {/* Indicators and Navigation */}
        {breakingArticles.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-3 pt-2 border-t border-red-500">
            {breakingArticles.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-white w-6' : 'bg-red-300'
                }`}
                aria-label={`Breaking news ${index + 1}`}
              />
            ))}
            <button
              onClick={goToNext}
              className="ml-auto text-xs font-medium hover:underline"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
