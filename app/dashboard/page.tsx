'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import {
  LayoutDashboard, FileText, PlusCircle, Eye, TrendingUp,
  Settings, LogOut, ChevronRight, Clock, Edit3, Trash2,
  BarChart2, Star, Zap, BookOpen
} from 'lucide-react'

type Tab = 'overview' | 'articles' | 'settings'

interface ArticleRow {
  id: string
  title: string
  category: string
  date: Date
  views: number
  slug: string
  featured?: boolean
  breaking?: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
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
    if (session?.user) fetchArticles()
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

  const totalViews = articles.reduce((s, a) => s + a.views, 0)
  const avgViews = articles.length ? Math.round(totalViews / articles.length) : 0

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-pulse text-gray-400 text-sm">Loading dashboard…</div>
        </div>
      </div>
    )
  }

  const initials = session.user.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Welcome back, {session.user.name ?? session.user.email}
              </p>
            </div>
            <Link
              href="/write"
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              New Article
            </Link>
          </div>

          <div className="flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:flex flex-col gap-1 w-52 flex-shrink-0">
              {(
                [
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'articles', label: 'My Articles', icon: FileText },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ] as { id: Tab; label: string; icon: any }[]
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    tab === id
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
              <hr className="my-3 border-gray-200" />
              <button
                onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </aside>

            {/* Mobile tabs */}
            <div className="lg:hidden flex gap-2 mb-6 w-full overflow-x-auto">
              {(['overview', 'articles', 'settings'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
                    tab === t ? 'bg-black text-white' : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">

              {/* ── OVERVIEW ── */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Articles', value: articles.length, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
                      { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'bg-green-50 text-green-600' },
                      { label: 'Avg. Views', value: avgViews.toLocaleString(), icon: BarChart2, color: 'bg-orange-50 text-orange-600' },
                      { label: 'Featured', value: articles.filter(a => a.featured).length, icon: Star, color: 'bg-yellow-50 text-yellow-600' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="bg-white rounded-xl p-5 border border-gray-200">
                        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Author profile card */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Your Profile</h2>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-lg">{session.user.name ?? 'Anonymous'}</p>
                        <p className="text-sm text-gray-500">{session.user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Staff Writer</p>
                      </div>
                      <Link
                        href={`/author/${(session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-sm text-gray-600 hover:text-black flex items-center gap-1 transition-colors"
                      >
                        View profile <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Recent articles */}
                  <div className="bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                      <h2 className="font-bold text-gray-900">Recent Articles</h2>
                      <button onClick={() => setTab('articles')} className="text-sm text-gray-500 hover:text-black transition-colors">
                        View all →
                      </button>
                    </div>
                    {loading ? (
                      <div className="p-6 text-center text-gray-400 text-sm animate-pulse">Loading…</div>
                    ) : articles.length === 0 ? (
                      <div className="p-10 text-center">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No articles yet.</p>
                        <Link href="/write" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-black hover:underline">
                          <PlusCircle className="w-4 h-4" /> Write your first article
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {articles.slice(0, 5).map((a) => (
                          <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <Link href={`/article/${a.slug}`} className="font-medium text-gray-900 hover:underline text-sm truncate block">
                                {a.title}
                              </Link>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span>{a.category}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views.toLocaleString()}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.date.toLocaleDateString()}</span>
                              </div>
                            </div>
                            {a.breaking && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded flex-shrink-0">Breaking</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link
                      href="/write"
                      className="flex items-center gap-4 p-5 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <Edit3 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold">Write New Article</p>
                        <p className="text-xs text-gray-400 mt-0.5">Publish to your readers</p>
                      </div>
                      <ChevronRight className="w-5 h-5 ml-auto opacity-50" />
                    </Link>
                    <Link
                      href={`/author/${(session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <TrendingUp className="w-5 h-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">View Public Profile</p>
                        <p className="text-xs text-gray-500 mt-0.5">See how others see you</p>
                      </div>
                      <ChevronRight className="w-5 h-5 ml-auto text-gray-400" />
                    </Link>
                  </div>
                </div>
              )}

              {/* ── ARTICLES ── */}
              {tab === 'articles' && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">All Articles ({articles.length})</h2>
                    <Link href="/write" className="flex items-center gap-1.5 text-sm font-medium text-black hover:underline">
                      <PlusCircle className="w-4 h-4" /> New
                    </Link>
                  </div>

                  {loading ? (
                    <div className="p-10 text-center text-gray-400 animate-pulse text-sm">Loading…</div>
                  ) : articles.length === 0 ? (
                    <div className="p-10 text-center">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No articles yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {articles.map((a) => (
                        <div key={a.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <Link href={`/article/${a.slug}`} className="font-semibold text-gray-900 hover:underline text-sm">
                              {a.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{a.category}</span>
                              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.views.toLocaleString()}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.date.toLocaleDateString()}</span>
                              {a.featured && <span className="text-yellow-600 font-medium">Featured</span>}
                              {a.breaking && <span className="text-red-600 font-medium">Breaking</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Link
                              href={`/write?edit=${a.id}`}
                              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(a.id)}
                              disabled={deleting === a.id}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SETTINGS ── */}
              {tab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-5">Account Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Display Name</label>
                        <input
                          type="text"
                          defaultValue={session.user.name ?? ''}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
                        <input
                          type="email"
                          defaultValue={session.user.email ?? ''}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black bg-gray-50"
                          disabled
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
                      </div>
                      <button className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                        Save Changes
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-1">Danger Zone</h2>
                    <p className="text-sm text-gray-500 mb-4">Irreversible actions. Be careful.</p>
                    <button
                      onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
                      className="flex items-center gap-2 px-5 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}