'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { CategoryFilter } from '@/components/category-filter'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, getArticlesByCategory, categories } from '@/lib/news-data'
import { ArrowLeft } from 'lucide-react'

export default function CategoryPage() {
  const params = useParams()
  const categoryName = params.name as string
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const foundArticles = getArticlesByCategory(categoryName)
    setArticles(foundArticles)
    setIsLoading(false)
  }, [categoryName])

  const isValidCategory = categories.includes(categoryName)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <CategoryFilter />

      <main className="flex-grow">
        {!isValidCategory ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link href="/" className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Category Not Found</h1>
              <p className="text-gray-600 mb-6">The category you're looking for doesn't exist.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Category Header */}
            <div className="mb-12">
              <Link href="/" className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-4">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                {categoryName}
              </h1>
              <p className="text-lg text-gray-600">
                Browse all the latest stories in {categoryName}
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-200 rounded-lg h-48 animate-pulse"
                  />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No articles found in this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {articles.map((article) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    variant="horizontal"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
