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
  ListChecks,
  Gear,
  User,
  List,
  CaretRight
} from '@phosphor-icons/react';
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
    { id: 'home-manager', label: 'Home Manager', icon: ListChecks, component: <HomeSectionManager /> },
    { id: 'menu-manager', label: 'Menu Manager', icon: List, href: `/${locale}/admin/menu`, adminOnly: true },
    { id: 'settings', label: 'Settings', icon: Gear, href: `/${locale}/admin/settings`, adminOnly: true },
  ];

  const isAdmin = session?.user?.role === 'admin';
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8 md:px-8 md:py-12 gap-8">

        {/* Workspace Welcomer & Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200/60">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Workspace
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2 text-slate-950">
              Control Panel
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Manage custom portal contents, review live engagement metrics, and track system health.
            </p>
          </div>

          {session?.user && (
            <div className="flex items-center gap-4 bg-white p-3 pr-5 rounded-2xl border border-slate-200/80 self-stretch md:self-auto justify-between md:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200/50">
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={22} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-950 leading-tight">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold capitalize mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    {session.user.role || 'Member'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </header>

        <div className="flex flex-col lg:flex-row flex-1 gap-8 items-start">

          {/* Navigation Sidebar / Panel */}
          <nav className="w-full grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col lg:w-64 gap-3 shrink-0">
            {filteredNav.map((item) => {
              const isActive = currentActiveTab === item.id;
              const Icon = item.icon;

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2.5 sm:gap-3 p-4 sm:p-3 sm:px-4 rounded-xl text-slate-600 hover:text-slate-955 hover:bg-slate-100 bg-white border border-slate-200/60 lg:border transition-all text-center sm:text-left"
                  >
                    <Icon size={20} className="shrink-0 text-slate-500" />
                    <span className="text-xs sm:text-sm font-bold tracking-tight">{item.label}</span>
                    <CaretRight size={14} className="ml-auto hidden sm:block text-slate-400" />
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentActiveTab(item.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2.5 sm:gap-3 p-4 sm:p-3 sm:px-4 rounded-xl transition-all text-center sm:text-left border ${
                    isActive
                      ? 'bg-slate-950 text-white border-slate-950'
                      : 'text-slate-600 hover:text-slate-955 hover:bg-slate-100 bg-white border-slate-200/60'
                  }`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} className="shrink-0" />
                  <span className="text-xs sm:text-sm font-bold tracking-tight">{item.label}</span>
                  {!isActive && <CaretRight size={14} className="ml-auto hidden sm:block text-slate-400" />}
                </button>
              );
            })}
          </nav>

          {/* Main Workspace Content Area */}
          <div className="flex-1 w-full min-w-0 bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8">
            {filteredNav.find(item => item.id === currentActiveTab)?.component}
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
