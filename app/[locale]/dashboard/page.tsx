
'use client'

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

import {
  House,
  FileText,
  ChartBar,
  SquaresFour,
  ListChecks,
  Gear,
  User
} from '@phosphor-icons/react/ssr';
import HomeView from '@/components/HomeView';
import ArticlesView from '@/components/ArticlesView';
import AnalysisView from '@/components/dashboard/AnalysisView';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import HomeSectionManager from '@/components/dashboard/HomeSectionManager';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session } = useSession();
  const params = useParams();
  const locale = params?.locale as string || 'bn';
  const isDesktop = !useIsMobile();
  const [currentActiveTab, setCurrentActiveTab] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: House, component: <DashboardOverview /> },
    { id: 'articles', label: 'Articles', icon: FileText, component: <ArticlesView /> },
    { id: 'analysis', label: 'Analysis', icon: ChartBar, component: <AnalysisView /> },
    { id: 'home-manager', label: 'Home Manager', icon: ListChecks, component: <HomeSectionManager />, adminOnly: true },
    { id: 'blocks', label: 'Blocks', icon: SquaresFour, href: `/${locale}/admin/blocks` },
    { id: 'settings', label: 'Settings', icon: Gear, href: `/${locale}/admin/settings`, adminOnly: true },
  ];

  const isAdmin = session?.user?.role === 'admin';
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-8 gap-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your content and track performance</p>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                {session.user.image ? (
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{session.user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{session.user.role}</p>
              </div>
            </div>
          )}
        </header>

        <div className={`flex flex-1 ${isDesktop ? 'flex-row' : 'flex-col'} gap-8`}>
          {/* Sidebar */}
          <nav className={`flex ${isDesktop ? 'w-64 flex-col' : 'w-full flex-row overflow-x-auto no-scrollbar'} gap-2`}>
            {filteredNav.map((item) => {
              const isActive = currentActiveTab === item.id;
              const Icon = item.icon;

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 p-3 px-4 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white transition-all whitespace-nowrap"
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentActiveTab(item.id)}
                  className={`flex items-center gap-3 p-3 px-4 rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {filteredNav.find(item => item.id === currentActiveTab)?.component}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
