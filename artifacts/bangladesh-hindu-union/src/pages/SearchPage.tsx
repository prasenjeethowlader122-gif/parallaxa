import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { SearchContent } from '@/components/search-content'

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-grow">
        <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
          <SearchContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
