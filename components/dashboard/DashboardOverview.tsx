'use client'

import React, { useState, useEffect } from 'react'
import { NewsArticle } from '@/lib/db/articles'
import { NewsCard } from '@/components/news-card'
import { Eye, Article, TrendUp, Clock, ArrowRight } from '@phosphor-icons/react/ssr'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function DashboardOverview() {
  const [latestArticles, setLatestArticles] = useState<NewsArticle[]>([])
  const [statsData, setStatsData] = useState({ articles: '...', views: '...' })
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const locale = params?.locale as string || 'bn'

  useEffect(() => {
    async function fetchData() {
      try {
        const [articlesRes, statsRes] = await Promise.all([
          fetch('/api/articles?limit=4'),
          fetch('/api/admin/stats')
        ])

        if (articlesRes.ok) {
          const data = await articlesRes.json()
          setLatestArticles(data)
        }

        if (statsRes.ok) {
          const data = await statsRes.json()
          setStatsData({
            articles: data.articles,
            views: data.views > 1000 ? (data.views / 1000).toFixed(1) + 'K' : data.views
          })
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = [
    { label: 'Total Articles', value: statsData.articles, icon: Article, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Views', value: statsData.views, icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg. Engagement', value: '12%', icon: TrendUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Pending Reviews', value: '3', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} weight="bold" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Latest Articles Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Recently Published</h2>
          <Link
            href={`/${locale}/dashboard#articles`}
            className="text-sm font-bold text-slate-900 flex items-center gap-1 hover:gap-2 transition-all"
          >
            View All <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {latestArticles.map(article => (
              <div key={article.id} className="group">
                <NewsCard article={article} variant="horizontal" className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full" />
              </div>
            ))}
            {latestArticles.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-500">No articles found. Start by creating one!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
