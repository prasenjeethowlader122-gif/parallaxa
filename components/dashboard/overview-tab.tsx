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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <StatCard label="Total articles" value={articles.length}                          icon={Icons.bookOpen} bg="#EAF3DE" color="#3B6D11" />
        <StatCard label="Total views"    value={totalViews.toLocaleString()}               icon={Icons.eye}      bg="#E6F1FB" color="#185FA5" />
        <StatCard label="Avg. views"     value={avgViews.toLocaleString()}                 icon={Icons.barChart} bg="#FAEEDA" color="#854F0B" />
        <StatCard label="Featured"       value={articles.filter(a => a.featured).length}   icon={Icons.star}     bg="#FBEAF0" color="#993556" />
      </div>

      {/* Author profile */}
      <Card
        title="Your profile"
        action={
          <Link
            href={`/author/${authorSlug}`}
            style={{
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: 'var(--text-tertiary)',
              textDecoration: 'none',
              fontFamily: "'DM Mono', monospace",
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
          >
            View public {Icons.chevron}
          </Link>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {session.user.name ?? 'Anonymous'}
            </p>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {session.user.email}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Staff Writer
            </p>
          </div>

          {/* Quick stats inline */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              flexShrink: 0,
              borderLeft: '0.5px solid var(--border)',
              paddingLeft: 20,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1,
                }}
              >
                {articles.length}
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>Articles</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1,
                }}
              >
                {(totalViews / 1000).toFixed(1)}k
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>Views</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent articles */}
      <Card
        title="Recent articles"
        action={
          <button
            onClick={onSwitchArticles}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              fontFamily: "'DM Mono', monospace",
              fontSize: 12,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
          >
            View all →
          </button>
        }
      >
        {loading ? (
          <SkeletonRows count={4} height={14} />
        ) : articles.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No articles yet.</p>
            <Link
              href="/write"
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {Icons.plus} Write your first article
            </Link>
          </div>
        ) : (
          <div>
            {articles.slice(0, 5).map(a => (
              <ArticleRowItem key={a.id} article={a} />
            ))}
          </div>
        )}
      </Card>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link
          href="/write"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 18,
            borderRadius: 16,
            background: 'var(--text-primary)',
            border: '0.5px solid var(--text-primary)',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              color: 'var(--bg-primary)',
            }}
          >
            {Icons.edit}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--bg-primary)',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              Write new article
            </p>
            <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.5)' }}>
              Publish to your readers
            </p>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              color: 'rgba(255,255,255,0.3)',
              flexShrink: 0,
              display: 'flex',
            }}
          >
            {Icons.chevron}
          </span>
        </Link>

        <Link
          href={`/author/${authorSlug}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 18,
            borderRadius: 16,
            background: 'var(--card-bg)',
            border: '0.5px solid var(--border)',
            textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover, var(--text-secondary))')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border)')}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: 'var(--hover-bg)',
              color: 'var(--text-secondary)',
            }}
          >
            {Icons.trending}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontFamily: "'Syne', sans-serif",
              }}
            >
              View public profile
            </p>
            <p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-tertiary)' }}>
              See how others see you
            </p>
          </div>
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--text-tertiary)',
              flexShrink: 0,
              display: 'flex',
            }}
          >
            {Icons.chevron}
          </span>
        </Link>
      </div>
    </div>
  )
}