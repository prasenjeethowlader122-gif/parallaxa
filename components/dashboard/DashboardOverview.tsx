
'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Eye,
  Users,
  TrendUp,
  Clock,
  ArrowRight
} from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Stats {
  articles: number;
  views: number;
  users: number;
}

interface RecentArticle {
  id: number;
  title: string;
  views: number;
  created_at: string;
}

export default function DashboardOverview() {
  const [data, setData] = useState<{stats: Stats, recentArticles: RecentArticle[]} | null>(null);
  const params = useParams();
  const locale = params?.locale || 'bn';

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(setData);
  }, []);

  if (!data) return <div className="animate-pulse space-y-4">
    <div className="h-32 bg-slate-100 rounded-2xl"></div>
    <div className="h-64 bg-slate-100 rounded-2xl"></div>
  </div>;

  const statCards = [
    { label: 'Total Articles', value: data.stats.articles, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Views', value: data.stats.views, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Users', value: data.stats.users, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl flex items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-4 rounded-xl`}>
              <stat.icon size={28} weight="duotone" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold">{stat.value.toLocaleString()}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <Clock size={20} className="text-slate-400" />
              Recent Articles
            </h3>
            <Link href={`/${locale}/dashboard#articles`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recentArticles.map((article) => (
              <div key={article.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-medium text-slate-900 truncate">{article.title}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-sm">
                  <Eye size={14} />
                  {article.views}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2">Ready to publish?</h3>
            <p className="text-slate-400 max-w-xs">Create a new article and reach your audience today.</p>
          </div>
          <Link
            href={`/${locale}/write`}
            className="mt-8 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 w-fit hover:bg-slate-100 transition-colors relative z-10"
          >
            Start Writing
            <Plus size={20} weight="bold" />
          </Link>
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <TrendUp size={200} weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Plus({ size, weight, className }: any) {
  return <svg width={size} height={size} viewBox="0 0 256 256" className={className}><path fill="currentColor" d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
}
