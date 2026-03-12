import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { SearchContent } from '@/components/search-content'

function SearchLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg h-48 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-grow">
        <Suspense fallback={<SearchLoadingFallback />}>
          <SearchContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}
