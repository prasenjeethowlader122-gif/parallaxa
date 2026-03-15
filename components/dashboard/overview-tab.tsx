import Link from 'next/link'
import { Icons } from './icons'
import { StatCard, Card, ArticleRowItem, SkeletonRows, type ArticleRow } from './ui'

interface Props {
  articles: ArticleRow[]
  loading: boolean
  session: any
  onSwitchArticles: () => void
}

export function OverviewTab({ articles, loading, session, onSwitchArticles }: Props) {
  const totalViews = articles.reduce((s, a) => s + a.views, 0)
  const avgViews   = articles.length ? Math.round(totalViews / articles.length) : 0
  const initials   = session.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'
  const authorSlug = (session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-5">

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total articles" value={articles.length}                        icon={Icons.bookOpen} bg="#EAF3DE" color="#3B6D11" />
        <StatCard label="Total views"    value={totalViews.toLocaleString()}             icon={Icons.eye}      bg="#E6F1FB" color="#185FA5" />
        <StatCard label="Avg. views"     value={avgViews.toLocaleString()}               icon={Icons.barChart} bg="#FAEEDA" color="#854F0B" />
        <StatCard label="Featured"       value={articles.filter(a => a.featured).length} icon={Icons.star}     bg="#FBEAF0" color="#993556" />
      </div>

      {/* Author profile */}
      <Card
        title="Your profile"
        action={
          <Link
            href={`/author/${authorSlug}`}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}
          >
            View public {Icons.chevron}
          </Link>
        }
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', fontFamily: "'Syne', sans-serif" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {session.user.name ?? 'Anonymous'}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {session.user.email}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Staff Writer</p>
          </div>
        </div>
      </Card>

      {/* Recent articles */}
      <Card
        title="Recent articles"
        action={
          <button
            onClick={onSwitchArticles}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace", fontSize: 12 }}
          >
            View all →
          </button>
        }
      >
        {loading ? (
          <SkeletonRows count={4} height={10} />
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
            {articles.slice(0, 5).map(a => <ArticleRowItem key={a.id} article={a} />)}
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
            <p className="text-sm font-semibold" style={{ color: 'var(--bg-primary)' }}>Write new article</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Publish to your readers</p>
          </div>
          <span className="ml-auto" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{Icons.chevron}</span>
        </Link>

        <Link
          href={`/author/${authorSlug}`}
          className="flex items-center gap-3 p-4 rounded-xl transition-colors"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
            {Icons.trending}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>View public profile</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>See how others see you</p>
          </div>
          <span className="ml-auto" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{Icons.chevron}</span>
        </Link>
      </div>
    </div>
  )
}
