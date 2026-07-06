'use client'

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

import HomeView from '@/components/HomeView';
import ArticlesView from '@/components/ArticlesView';
import AnalysisView from '@/components/dashboard/AnalysisView';
import Link from 'next/link';

const NavLists = [
  {
    name: '#home',
    icon: 'dashboard',
    label: 'Overview',
    index: <HomeView initialLatest={[]} initialWorld={[]} initialTech={[]} />
  },
  {
    name: '#articles',
    icon: 'article',
    label: 'Articles',
    index: <ArticlesView />
  },
  {
    name: '#analysis',
    icon: 'bar_chart',
    label: 'Analytics',
    index: <AnalysisView />
  },
  {
    name: '/admin/blocks',
    icon: 'view_in_ar',
    label: 'Blocks'
  },
  {
    name: '/admin/settings',
    icon: 'settings',
    label: 'Settings'
  }
];

export default function Dashboard() {
  const { data: session } = useSession();
  const params = useParams();
  const locale = params?.locale as string || 'bn';
  const isDesktop = !useIsMobile();
  const [currentActiveTab, setCurrentActiveTab] = useState('#home');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">Editorial Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">Welcome back, {session?.user?.name || 'User'}. Manage your content and performance here.</p>
              </div>
              <div className="flex items-center gap-3">
                 <Link
                  href={`/${locale}/write`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all"
                >
                  <span className="material-symbols-rounded text-lg">edit</span>
                  Create Article
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar/Tabs */}
          <div className={`flex shrink-0 ${isDesktop ? 'w-64 flex-col border-r border-slate-200 bg-white/50 py-6' : 'w-full bg-white border-b border-slate-200'}`}>
            <nav className={`grid ${isDesktop ? 'grid-cols-1 px-3 gap-1' : 'grid-cols-2 sm:grid-cols-3 gap-2 p-4'}`}>
              {
                NavLists.map((_nav) => {
                  const isActive = _nav.name === currentActiveTab;

                  if (_nav.name.startsWith('/')) {
                    return (
                      <Link
                        key={_nav.name}
                        href={`/${locale}${_nav.name}`}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-all whitespace-nowrap"
                      >
                        <span className="material-symbols-rounded text-xl">{_nav.icon}</span>
                        <span>{_nav.label}</span>
                      </Link>
                    )
                  }

                  return (
                    <button
                      key={_nav.name}
                      onClick={() => setCurrentActiveTab(_nav.name)}
                      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
                      } ${!isDesktop ? 'flex-col gap-1 p-4 h-auto justify-center' : ''}`}
                    >
                      <span className="material-symbols-rounded text-xl">{_nav.icon}</span>
                      <span>{_nav.label}</span>
                    </button>
                  )
                })
              }
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {NavLists.find(tab => tab.name === currentActiveTab)?.index}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
