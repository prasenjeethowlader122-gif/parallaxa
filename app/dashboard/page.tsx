'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {useIsMobile} from '@/hooks/use-mobile'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  Icons,
  NavItem,
  OverviewTab,
  ArticlesTab,
  SettingsTab,
  IntelligenceTab,
  type ArticleRow,
} from '@/components/dashboard'

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'articles' | 'settings' | 'intelligence'

const BASE_NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: Icons.grid },
  { id: 'articles', label: 'My Articles', icon: Icons.file },
  { id: 'settings', label: 'Settings', icon: Icons.settings },
]

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />
      <div className="flex-grow flex items-center justify-center">
        <div className="space-y-4 w-full max-w-5xl px-6">
          <div className="h-7 w-40 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--hover-bg)' }} />
            ))}
          </div>
          <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--hover-bg)' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

function DashboardPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const isMobile = useIsMobile()
  // FIX 1: Build nav dynamically based on role, never mutate the module-level array
  /**const nav = [
    ...BASE_NAV,
    ...(session?.user?.role === 'admin'
      ? [{ id: 'intelligence' as Tab, label: 'AI', icon: Icons.file }]
      : []),
  ]**/

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    // FIX 2: Guard against null session before accessing session.user
    if (!session?.user) return
    const fetchArticles = async () => {
      try {
        const res = await fetch('/api/articles/mine')
        if (res.ok) {
          const data = await res.json()
          setArticles(data.map((a: any) => ({ ...a, date: new Date(a.date) })))
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [session])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article? This cannot be undone.')) return
    setDeleting(id)
    try {
      await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      setArticles(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(null)
    }
  }

  if (status === 'loading' || !session?.user) return <DashboardSkeleton />

  const initials = session.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-2xl font-bold leading-tight">Dashboard</h1>
              <p className="mt-0.5 text-sm">
                Welcome back, {session.user.name ?? session.user.email}
              </p>
            </div>
            <Link
              href="/write"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
            >
              {Icons.plus}
              <span className="hidden sm:inline">New Article</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>

          {/* Mobile tab pills */}
          {isMobile &&  (
          <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-1">
            {nav.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: tab === id ? 'var(--text-primary)' : 'transparent',
                  color: tab === id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${tab === id ? 'var(--text-primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>)}

          {/* Body: sidebar + content */}
          <div className="flex items-start gap-6">

            {/* Sidebar — desktop only */}
            {!isMobile && (
            <aside className=" flex-col gap-1 w-48 flex-shrink-0">
              {nav.map(({ id, label, icon }) => (
                <NavItem key={id} icon={icon} label={label} active={tab === id} onClick={() => setTab(id)} />
              ))}

              <div className="my-2" style={{ height: 1, background: 'var(--border)' }} />

              {/* Author mini-card */}
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mt-1"
                style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontFamily: "'Syne', sans-serif" }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {session.user.name ?? 'Anonymous'}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-tertiary)' }}>Staff Writer</p>
                </div>
              </div>

              <div className="my-2" style={{ height: 1, background: 'var(--border)' }} />

              <NavItem
                icon={Icons.logout}
                label="Sign Out"
                danger
                onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
              />
            </aside>)}

            {/* Tab content */}
            <div className="flex-1 min-w-0">
              {tab === 'overview' && (
                <OverviewTab
                  articles={articles}
                  loading={loading}
                  session={session}
                  onSwitchArticles={() => setTab('articles')}
                />
              )}
              {tab === 'intelligence' && (
                <IntelligenceTab />
              )}
              {tab === 'articles' && (
                <ArticlesTab
                  articles={articles}
                  loading={loading}
                  deleting={deleting}
                  onDelete={handleDelete}
                  userRole={session.user.role}
                />
              )}
              {tab === 'settings' && (
                <SettingsTab session={session} />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ─── Suspense wrapper ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}