

import { useState, useEffect } from 'react'
import { useSearchParams } from '@/hooks/use-navigation'
import Link from '@/components/ui/next-link-shim'
import { NewsCard } from '@/components/news-card'
import { NewsArticle, searchArticlesByQuery } from '@/lib/db/articles'
import { ArrowLeft, Search as SearchIcon } from 'lucide-react'

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState < NewsArticle[] > ([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function load() {
      if (query.trim()) {
        const found = await searchArticlesByQuery(query)
        setResults(found)
      } else {
        setResults([])
      }
      setIsLoading(false)
    }
    load()
  }, [query])
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link href="/" className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <SearchIcon className="w-6 h-6 text-foreground" />
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Search Results</h1>
        </div>
        {query && (
          <p className="text-lg text-gray-600">
            Results for: <span className="font-semibold text-foreground">"{query}"</span>
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-48 animate-pulse" />
          ))}
        </div>
      ) : !query ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Enter a search query to find articles.</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">No results found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any articles matching "{query}"
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Go Back Home
          </Link>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-8">
            Found <span className="font-semibold">{results.length}</span> result{results.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {results.map((article) => (
              <NewsCard key={article.id} article={article} variant="horizontal" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}