import React from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getUserById } from '@/lib/db/user'
import { getPublishedArticles } from '@/lib/db/articles'
import { NewsCard } from '@/components/news-card'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export default async function AuthorProfilePage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params
  const user = await getUserById(id)

  if (!user) {
    notFound()
  }

  // In a real app, you'd have a specific query for articles by user_id
  // For now, we'll filter all published articles by author name as a proxy
  const allArticles = await getPublishedArticles()
  const authorArticles = allArticles.filter(a => a.author === user.name)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1">
        {/* Profile Header */}
        <div className="bg-white border-b border-slate-200 pt-16 pb-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-xl mb-6 items-center justify-center overflow-hidden">
               <span className="material-symbols-rounded text-6xl text-slate-400">account_circle</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 mb-2">{user.name}</h1>
            <p className="text-slate-500 font-medium mb-6 uppercase tracking-[0.2em] text-xs">Verified Author</p>

            <div className="flex items-center justify-center gap-6 text-slate-400">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-900">{authorArticles.length}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest">Articles</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-900">
                  {authorArticles.reduce((sum, a) => sum + a.views, 0)}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest">Views</span>
              </div>
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-2xl font-bold text-slate-950">Published Stories</h2>
            <div className="h-px flex-1 bg-slate-200 mx-6"></div>
          </div>

          {authorArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {authorArticles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
               <span className="material-symbols-rounded text-6xl text-slate-200 mb-4">newspaper</span>
               <p className="text-slate-500 font-medium">This author hasn't published any stories yet.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
