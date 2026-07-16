'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { NewsCard } from '@/components/news-card'
import { NewsArticle } from '@/lib/db/articles'
import {
  House,
  Globe,
  Cpu,
  Briefcase,
  Trophy,
  Flask,
  Pulse,
  ChatTeardropText,
  Sparkle
} from '@phosphor-icons/react/ssr'

interface DynamicSection {
  id: number
  title: string
  type: string
  layout: string
  articles: NewsArticle[]
}

interface HomeClientProps {
  sections: DynamicSection[]
}

export default function HomeClient({ sections = [] }: HomeClientProps) {
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'bn'
  const hasArticles = sections && sections.some(s => s.articles && s.articles.length > 0)

  return (
    <div className="flex flex-col w-full h-auto bg-slate-50/50">
      <main className="flex-grow w-full pb-16">
        {!hasArticles && (
          <div className="w-full max-w-4xl mx-auto px-4 py-24 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              <Sparkle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">কোনো প্রকাশিত নিবন্ধ পাওয়া যায়নি</h2>
            <p className="text-slate-500 max-w-md">নিবন্ধ দেখতে অনুগ্রহ করে প্রথমে ড্যাশবোর্ড থেকে বা "Write" পেজে গিয়ে নতুন নিবন্ধ তৈরি করুন এবং সেটি পাবলিশ করুন।</p>
            <Link
              href={`/${locale}/write`}
              className="mt-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
            >
              নতুন নিবন্ধ লিখুন
            </Link>
          </div>
        )}

        {sections.map((section) => {
          if (!section.articles || section.articles.length === 0) return null

          // ── GRID LAYOUT ───────────────────────────────────────────────────
          if (section.layout === 'grid') {
            const [mostRecent, second, third, fourth] = section.articles;

            return (
              <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
                  <div className="w-1 h-6 bg-slate-900 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                </div>

                {/* Mobile Scroller */}
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:hidden no-scrollbar -mx-4 px-4">
                  {section.articles.map((article) => (
                    <div key={article.id} className="w-[280px] shrink-0 snap-start snap-always">
                      <NewsCard article={article} variant="default" className="h-full" />
                    </div>
                  ))}
                </div>

                {/* Tablet Grid: Clean 2 columns */}
                {section.articles.length >= 4 ? (
                  <>
                    <div className="hidden md:grid lg:hidden gap-6 grid-cols-2">
                      {section.articles.slice(0, 4).map((article) => (
                        <NewsCard key={article.id} article={article} variant="default" />
                      ))}
                    </div>

                    {/* Desktop Custom Bento Grid */}
                    <div
                      className="hidden lg:grid gap-6 grid-cols-12"
                      style={{ gridTemplateRows: 'repeat(2, minmax(240px, auto))' }}
                    >
                      {mostRecent && (
                        <div className="col-span-7 row-span-2">
                          <NewsCard article={mostRecent} variant="featured" className="h-full" />
                        </div>
                      )}
                      {second && (
                        <div className="col-span-5 col-start-8 row-start-1">
                          <NewsCard article={second} variant="featured" className="h-full" />
                        </div>
                      )}
                      {third && (
                        <div className="col-span-2 col-start-8 row-start-2">
                          <NewsCard article={third} variant="featured" className="h-full" />
                        </div>
                      )}
                      {fourth && (
                        <div className="col-span-3 col-start-10 row-start-2">
                          <NewsCard article={fourth} variant="featured" className="h-full" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="hidden md:grid gap-6 grid-cols-2 lg:grid-cols-3">
                    {section.articles.map((article) => (
                      <NewsCard key={article.id} article={article} variant="default" />
                    ))}
                  </div>
                )}
              </section>
            )
          }

          // ── LIST LAYOUT (Redesigned as clean, responsive horizontal-card grid) ─
          if (section.layout === 'list') {
            return (
              <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
                  <div className="w-1 h-6 bg-slate-900 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.articles.map((article) => (
                    <NewsCard
                      key={article.id ?? 'null'}
                      article={article}
                      variant="horizontal"
                    />
                  ))}
                </div>
              </section>
            )
          }

          // ── SLIDER LAYOUT ─────────────────────────────────────────────────
          if (section.layout === 'slider') {
            return (
              <section key={section.id} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
                  <div className="w-1 h-6 bg-slate-900 rounded-full" />
                  <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                </div>

                {/* Mobile Scroller */}
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 md:hidden no-scrollbar -mx-4 px-4">
                  {section.articles.map((article) => (
                    <div key={article.id} className="w-[280px] shrink-0 snap-start snap-always">
                      <NewsCard article={article} variant="default" className="h-full" />
                    </div>
                  ))}
                </div>

                {/* Tablet / Desktop Grid */}
                <div className="hidden md:grid gap-6 grid-cols-2 lg:grid-cols-3">
                  {section.articles.map((article) => (
                    <NewsCard key={article.id} article={article} variant="default" />
                  ))}
                </div>
              </section>
            )
          }

          return null
        })}
      </main>
    </div>
  )
}
