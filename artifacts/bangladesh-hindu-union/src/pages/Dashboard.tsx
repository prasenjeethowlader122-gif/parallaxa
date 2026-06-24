import React, { useState } from 'react'
import { useSession } from '@/hooks/use-session'
import { useLocation } from 'wouter'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import HomeView from '@/components/HomeView'
import ArticlesView from '@/components/ArticlesView'
import AnalysisView from '@/components/dashboard/AnalysisView'
import { Home as HomeIcon, FileText, BarChart3 } from 'lucide-react'

const NavLists = [
  { name: '#home', icon: HomeIcon, index: <HomeView initialLatest={[]} initialWorld={[]} initialTech={[]} /> },
  { name: '#articles', icon: FileText, index: <ArticlesView /> },
  { name: '#analysis', icon: BarChart3, index: <AnalysisView /> },
]

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [, navigate] = useLocation()
  const [active, setActive] = useState(0)

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (status === 'unauthenticated') { navigate('/bn/auth/signin'); return null }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="hidden md:flex flex-col gap-1 p-4 border-r border-border w-48">
          {NavLists.map((item, i) => (
            <button
              key={item.name}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              <item.icon className="h-4 w-4" />
              {item.name.replace('#', '')}
            </button>
          ))}
        </aside>
        <main className="flex-1">{NavLists[active].index}</main>
      </div>
      <Footer />
    </div>
  )
}
