'use client'

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

import { Home as HomeIcon, FileText as PagesIcon, BarChart3, LayoutGrid } from 'lucide-react';
import HomeView from '@/components/HomeView';
import ArticlesView from '@/components/ArticlesView';
import AnalysisView from '@/components/dashboard/AnalysisView';
import Link from 'next/link';

const NavLists = [
  {
    name: '#home',
    icon: HomeIcon,
    index: <HomeView initialLatest={[]} initialWorld={[]} initialTech={[]} />
  },
  {
    name: '#articles',
    icon: PagesIcon,
    index: <ArticlesView />
  },
  {
    name: '#analysis',
    icon: BarChart3,
    index: <AnalysisView />
  },
  {
    name: '/admin/blocks',
    icon: LayoutGrid,
    label: 'Blocks'
  }
];

export default function Dashboard() {
  const { data: session } = useSession();
  const params = useParams();
  const locale = params?.locale as string || 'bn';
  const isDesktop = !useIsMobile();
  const [currentActiveTab, setCurrentActiveTab] = useState('#home');

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Header />
      
      <div className="w-full py-6 p-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <small className="text-gray-500">Welcome to dashboard page.</small>
      </div>

      <div className={`w-full flex-1 flex ${isDesktop ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        
        {/* Nav List Sidebar/Topbar */}
        <div className={`flex px-4 shrink-0 ${isDesktop ? 'w-64 flex-col border-r border-gray-100' : 'w-full flex-row justify-start gap-2 border-b border-gray-100 overflow-x-auto no-scrollbar scrollbar-hide'}`}>
          {
            NavLists.map((_nav) => {
              const isActive = _nav.name === currentActiveTab;
              
              if (_nav.name.startsWith('/')) {
                return (
                  <Link
                    key={_nav.name}
                    href={`/${locale}${_nav.name}`}
                    className={`p-3 px-4 flex flex-row text-sm items-center gap-2 capitalize transition-colors ${
                      isDesktop ? 'justify-start' : 'justify-center'
                    } text-gray-500 hover:text-black`}
                  >
                    <_nav.icon className="w-4 h-4" />
                    <p>{_nav.label}</p>
                  </Link>
                )
              }

              return (
                <button 
                  key={_nav.name}
                  onClick={() => setCurrentActiveTab(_nav.name)}
                    className={`relative p-3 px-4 flex flex-row text-sm items-center gap-2 capitalize transition-colors shrink-0 ${
                    isDesktop ? 'justify-start' : 'justify-center'
                  } ${
                    isActive ? 'text-black font-bold' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <_nav.icon className="w-4 h-4" />
                  <p>{_nav.name.replace('#', '')}</p>

                  {/* ACTIVE INDICATOR (INTEGRATOR) AT THE BOTTOM */}
                  {isActive && (
                    <span 
                      className={`absolute  bottom-0 rounded-full bg-black transition-all ${
                        isDesktop 
                          ? 'left-4 right-4 h-[1px]' // Horizontal line at bottom of button in sidebar
                          : 'left-0 right-0 h-[1px]' // Full width underline in topbar
                      }`}
                    />
                  )}
                </button>
              )
            })
          }
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {NavLists.find(tab => tab.name === currentActiveTab)?.index}
          </div>
        </div>
        
      </div>
      
      <Footer />
    </div>
  );
}