'use client'

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import useIsMobile from '@/hooks/use-mobile';
import { slabo } from '@/lib/font';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

// 1. FIXED: Imported icons and components explicitly with distinct names 
// to avoid naming collisions (e.g., 'Home' as an icon vs 'Home' as a component).
import { Home as HomeIcon, FileText as PagesIcon } from 'lucide-react'; 
import HomeView from '@/components/HomeView'; 
import ArticlesView from '@/components/ArticlesView';

const NavLists = [
  {
    name: '#home',
    icon: HomeIcon,
    index: <HomeView />
  },
  {
    name: '#articles',
    icon: PagesIcon,
    index: <ArticlesView />
  }
];

export default function Dashboard() {
  const { data: session } = useSession();
  const isDesktop = !useIsMobile();
  const [currentActiveTab, setCurrentActiveTab] = useState('#home');

  return (
    <div className="min-h-screen bg-white text-black">
      <Header />
      
      {/* 2. FIXED: Tailwind does not support string interpolation for partial class names.
          Instead of `flex-${...}`, you must use the full class name like `flex-row`. */}
      <div className={`w-full flex ${isDesktop ? 'flex-row' : 'flex-col'}`}>
        
        {/* Nav List Sidebar/Topbar */}
        <div className={`flex px-4 ${isDesktop ? 'w-64 flex-col' : 'w-full flex-row justify-start gap-4'}`}>
          {
            NavLists.filter(nav => nav.name.startsWith('#')).map((_nav) => {
              const isActive = _nav.name === currentActiveTab;
              
              return (
                <button 
                  key={_nav.name} // 3. FIXED: Added the required React `key` prop for mapped lists.
                  onClick={() => setCurrentActiveTab(_nav.name)} // 4. FIXED: Added `onClick` so the tabs actually switch.
                  // 5. FIXED: Added missing spaces between standard classes and dynamic classes.
                  className={`p-2 px-4 pb-4 flex flex-row items-center gap-2 capitalize transition-colors ${
                    isDesktop ? 'justify-start' : 'justify-center'
                  } ${
                    isActive ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <_nav.icon className="w-5 h-5" />
                  <p>{_nav.name.replace('#', '')}</p>
                </button>
              )
            })
          }
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-4">
          {/* 6. FIXED: Added optional chaining (?.) to prevent crashes if find() returns undefined */}
          {NavLists.find(tab => tab.name === currentActiveTab)?.index}
        </div>
        
      </div>
      <Footer />
    </div>
  );
}