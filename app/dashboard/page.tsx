'use client'

/**
 * dashboard/page.tsx
 *
 * Design system: flat editorial UI
 *   Fonts  : Syne (headings/labels) + DM Mono (meta/mono) — add to layout.tsx:
 *            import { Syne, DM_Mono } from 'next/font/google'
 *   Colors : neutral ink scale + acid-lime accent (#d4f53c)
 *   Borders: 1px solid #e5e2db (light) / #1e1b14 (dark)
 *   Radius : 8px cards, 6px elements, 4px pills
 */

import { useState, useEffect, Suspense } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Micro SVG icons (16×16, stroke-only) ────────────────────────────────────

const Icons = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  eye: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  clock: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  edit: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M12 2l2 2-9 9H3v-2L12 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 5h10M6 5V3h4v2M5 5l.5 8h5L11 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  star: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l1.9 3.8L14 5.6l-3 2.9.7 4.1L8 10.5l-3.7 2.1.7-4.1-3-2.9 4.1-.8L8 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  trending: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 10l3-4 3 2 3-4 3-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  bookOpen: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 3C6 1.5 2 2 2 2v11s4-.5 6 1c2-1.5 6-1 6-1V2s-4-.5-6 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 3v12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  barChart: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 12V7M6 12V4M10 12V8M14 12V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Stat card used in overview grid */
function StatCard({
  label, value, icon, bg, color,
}: { label: string; value: string | number; icon: React.ReactNode; bg: string; color: string }) {
  return (
    <div className="rounded-lg p-4 flex flex-col gap-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: bg, color }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
    </div>
  )
}

/** Sidebar navigation item */
function NavItem({
  icon, label, active, danger, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-all duration-150"
      style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? 'var(--text-primary)' : 'transparent',
        color: active ? 'var(--bg-primary)' : danger ? 'var(--red)' : 'var(--text-secondary)',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}

/** Article row used in both recent + all-articles lists */
function ArticleRow({
  article, showActions, onEdit, onDelete, deleting,
}: {
  article: ArticleRow
  showActions?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  deleting?: string | null
}) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-100"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex-1 min-w-0">
        <Link
          href={`/article/${article.slug}`}
          className="text-sm font-medium block truncate hover:underline"
          style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}
        >
          {article.title}
        </Link>
        <div className="flex items-center gap-2 mt-1 flex-wrap" style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)', fontSize: 10 }}
          >
            {article.category}
          </span>
          <span className="flex items-center gap-1">{Icons.eye} {article.views.toLocaleString()}</span>
          <span className="flex items-center gap-1">{Icons.clock} {article.date.toLocaleDateString()}</span>
          {article.breaking && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#fee2e2', color: '#b91c1c' }}>
              Breaking
            </span>
          )}
          {article.featured && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: '#fef3c7', color: '#92400e' }}>
              Featured
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
          <button
            onClick={() => onEdit?.(article.id)}
            className="p-1.5 rounded-md transition-colors duration-100"
            title="Edit"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
          >
            {Icons.edit}
          </button>
          <button
            onClick={() => onDelete?.(article.id)}
            disabled={deleting === article.id}
            className="p-1.5 rounded-md transition-colors duration-100 disabled:opacity-40"
            title="Delete"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; (e.currentTarget as HTMLElement).style.color = '#b91c1c' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
          >
            {Icons.trash}
          </button>
        </div>
      )}
    </div>
  )
}

/** Card shell with optional header */
function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ articles, loading, session, onSwitchArticles }: {
  articles: ArticleRow[]
  loading: boolean
  session: any
  onSwitchArticles: () => void
}) {
  const totalViews = articles.reduce((s, a) => s + a.views, 0)
  const avgViews   = articles.length ? Math.round(totalViews / articles.length) : 0
  const initials   = session.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="flex flex-col gap-5">

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total articles"  value={articles.length}                 icon={Icons.bookOpen} bg="#EAF3DE" color="#3B6D11" />
        <StatCard label="Total views"     value={totalViews.toLocaleString()}      icon={Icons.eye}      bg="#E6F1FB" color="#185FA5" />
        <StatCard label="Avg. views"      value={avgViews.toLocaleString()}        icon={Icons.barChart} bg="#FAEEDA" color="#854F0B" />
        <StatCard label="Featured"        value={articles.filter(a => a.featured).length} icon={Icons.star} bg="#FBEAF0" color="#993556" />
      </div>

      {/* Author profile */}
      <Card title="Your profile" action={
        <Link
          href={`/author/${(session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')}`}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}
        >
          View public {Icons.chevron}
        </Link>
      }>
        <div className="flex items-center gap-4 px-5 py-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontFamily: "'Syne', sans-serif" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
              {session.user.name ?? 'Anonymous'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-secondary)' }}>
              {session.user.email}
            </p>
            <p className="text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-tertiary)' }}>
              Staff Writer
            </p>
          </div>
        </div>
      </Card>

      {/* Recent articles */}
      <Card
        title="Recent articles"
        action={
          <button
            onClick={onSwitchArticles}
            className="text-xs transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}
          >
            View all →
          </button>
        }
      >
        {loading ? (
          <div className="p-5 space-y-2.5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-md animate-pulse" style={{ background: 'var(--hover-bg)' }} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No articles yet.</p>
            <Link
              href="/write"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
              style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}
            >
              {Icons.plus} Write your first article
            </Link>
          </div>
        ) : (
          <div>
            {articles.slice(0, 5).map(a => (
              <ArticleRow key={a.id} article={a} />
            ))}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/write"
          className="flex items-center gap-3 p-4 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: 'var(--text-primary)', border: '1px solid var(--text-primary)' }}
        >
          <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <span style={{ color: 'var(--bg-primary)' }}>{Icons.edit}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--bg-primary)' }}>Write new article</p>
            <p className="text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'rgba(255,255,255,0.45)' }}>Publish to your readers</p>
          </div>
          <span className="ml-auto" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{Icons.chevron}</span>
        </Link>

        <Link
          href={`/author/${(session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')}`}
          className="flex items-center gap-3 p-4 rounded-xl transition-colors"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
            {Icons.trending}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>View public profile</p>
            <p className="text-xs mt-0.5" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-tertiary)' }}>See how others see you</p>
          </div>
          <span className="ml-auto" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{Icons.chevron}</span>
        </Link>
      </div>
    </div>
  )
}

// ─── Tab: Articles ────────────────────────────────────────────────────────────

function ArticlesTab({ articles, loading, deleting, onDelete }: {
  articles: ArticleRow[]
  loading: boolean
  deleting: string | null
  onDelete: (id: string) => void
}) {
  const router = useRouter()

  return (
    <Card
      title={`All articles (${articles.length})`}
      action={
        <Link
          href="/write"
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}
        >
          {Icons.plus} New
        </Link>
      }
    >
      {loading ? (
        <div className="p-5 space-y-2.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 rounded-md animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No articles yet.</p>
        </div>
      ) : (
        <div>
          {articles.map(a => (
            <ArticleRow
              key={a.id}
              article={a}
              showActions
              onEdit={id => router.push(`/write?edit=${id}`)}
              onDelete={onDelete}
              deleting={deleting}
            />
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── Tab: Settings ────────────────────────────────────────────────────────────

function SettingsTab({ session }: { session: any }) {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Account settings">
        <div className="p-5 flex flex-col gap-5">

          <div>
            <label
              htmlFor="displayName"
              className="block mb-1.5 uppercase tracking-widest"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}
            >
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              defaultValue={session.user.name ?? ''}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: "'Syne', sans-serif",
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                outline: 'none',
                transition: 'border-color .15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--text-secondary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block mb-1.5 uppercase tracking-widest"
              style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)' }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              defaultValue={session.user.email ?? ''}
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                background: 'var(--hover-bg)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                outline: 'none',
                cursor: 'not-allowed',
              }}
            />
            <p className="mt-1 text-xs" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-tertiary)' }}>
              Email cannot be changed here.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: saved ? '#3B6D11' : 'var(--text-primary)',
                color: 'var(--bg-primary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Danger zone">
        <div className="p-5">
          <p className="text-sm mb-4" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-tertiary)' }}>
            Irreversible actions. Be careful.
          </p>
          <button
            type="button"
            onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: 'transparent',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {Icons.logout} Sign out
          </button>
        </div>
      </Card>
    </div>
  )
}

// ─── CSS variables injected globally ─────────────────────────────────────────
// Add to your globals.css or layout.tsx <style> tag:
/*
:root {
  --bg-primary:     #ffffff;
  --card-bg:        #ffffff;
  --hover-bg:       #f5f2eb;
  --border:         #e5e2db;
  --text-primary:   #0d0d0a;
  --text-secondary: #4a4337;
  --text-tertiary:  #968d78;
  --red:            #b91c1c;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary:     #0d0d0a;
    --card-bg:        #111009;
    --hover-bg:       #1a1712;
    --border:         #1e1b14;
    --text-primary:   #e8e3d8;
    --text-secondary: #968d78;
    --text-tertiary:  #4a4337;
    --red:            #f87171;
  }
}
*/

// ─── Main page component ──────────────────────────────────────────────────────

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview',    icon: Icons.grid     },
  { id: 'articles', label: 'My Articles', icon: Icons.file     },
  { id: 'settings', label: 'Settings',    icon: Icons.settings },
]

function DashboardPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab]         = useState<Tab>('overview')
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading]   = useState(true)
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

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="space-y-4 w-full max-w-5xl px-6">
            <div className="h-7 w-40 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--hover-bg)' }} />)}
            </div>
            <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          </div>
        </div>
      </div>
    )
  }

  const initials = session.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header />

      <main className="flex-grow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                Dashboard
              </h1>
              <p className="mt-0.5 text-sm" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-tertiary)' }}>
                Welcome back, {session.user.name ?? session.user.email}
              </p>
            </div>

            <Link
              href="/write"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
              }}
            >
              {Icons.plus}
              <span className="hidden sm:inline">New Article</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>

          {/* ── Mobile tab pills ── */}
          <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-1">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  background: tab === id ? 'var(--text-primary)' : 'transparent',
                  color: tab === id ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${tab === id ? 'var(--text-primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Body: sidebar + content ── */}
          <div className="flex items-start gap-6">

            {/* Sidebar — desktop only */}
            <aside className="hidden lg:flex flex-col gap-1 w-48 flex-shrink-0">
              {NAV.map(({ id, label, icon }) => (
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
                  <p className="text-xs font-semibold truncate" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--text-primary)' }}>
                    {session.user.name ?? 'Anonymous'}
                  </p>
                  <p className="text-[10px] truncate" style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-tertiary)' }}>
                    Staff Writer
                  </p>
                </div>
              </div>

              <div className="my-2" style={{ height: 1, background: 'var(--border)' }} />

              <NavItem
                icon={Icons.logout}
                label="Sign Out"
                danger
                onClick={() => signOut({ redirect: true, redirectUrl: '/' })}
              />
            </aside>

            {/* ── Tab content ── */}
            <div className="flex-1 min-w-0">
              {tab === 'overview' && (
                <OverviewTab
                  articles={articles}
                  loading={loading}
                  session={session}
                  onSwitchArticles={() => setTab('articles')}
                />
              )}
              {tab === 'articles' && (
                <ArticlesTab
                  articles={articles}
                  loading={loading}
                  deleting={deleting}
                  onDelete={handleDelete}
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <div className="space-y-4 w-full max-w-5xl px-6">
            <div className="h-7 w-40 rounded-lg animate-pulse" style={{ background: 'var(--hover-bg)' }} />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'var(--hover-bg)' }} />)}
            </div>
            <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--hover-bg)' }} />
          </div>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  )
}