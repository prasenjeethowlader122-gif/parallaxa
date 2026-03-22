'use client'

import Link from 'next/link'
import { Icons } from './icons'
import { StatCard, Card, ArticleRowItem, SkeletonRows, type ArticleRow } from './ui'
import { useMemo } from 'react'

interface Props {
  articles: ArticleRow[]
  loading: boolean
  session: any
  onSwitchArticles: () => void
}

// ─── Inline sparkline chart (no external deps, pure SVG) ─────────────────────
function ViewsSparkline({ articles }: { articles: ArticleRow[] }) {
  const data = useMemo(() => {
    // Group views by week (last 8 weeks)
    const now = Date.now()
    const WEEK = 7 * 24 * 60 * 60 * 1000
    const buckets = Array.from({ length: 8 }, (_, i) => ({
      label: `W${8 - i}`,
      views: 0,
      start: now - (8 - i) * WEEK,
      end:   now - (7 - i) * WEEK,
    }))
    articles.forEach(a => {
      const ts = new Date(a.date ?? '').getTime()
      const bucket = buckets.find(b => ts >= b.start && ts < b.end)
      if (bucket) bucket.views += a.views
    })
    return buckets
  }, [articles])

  const max = Math.max(...data.map(d => d.views), 1)
  const W = 280, H = 72, PAD = 4
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - (d.views / max) * (H - PAD * 2)
    return `${x},${y}`
  })
  const polyline = pts.join(' ')
  // filled area
  const area = `${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)"  stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)"  stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-fill)" />
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest dot */}
      {pts[pts.length - 1] && (
        <circle
          cx={pts[pts.length - 1].split(',')[0]}
          cy={pts[pts.length - 1].split(',')[1]}
          r="3"
          fill="var(--accent)"
        />
      )}
    </svg>
  )
}

// ─── Bar chart: views per article (top 5) ────────────────────────────────────
function ArticleBarChart({ articles }: { articles: ArticleRow[] }) {
  const top = useMemo(
    () => [...articles].sort((a, b) => b.views - a.views).slice(0, 5),
    [articles]
  )
  const max = Math.max(...top.map(a => a.views), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
      {top.map((a, i) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* rank */}
          <span
            style={{
              width: 16,
              fontSize: 10,
              fontWeight: 700,
              color: i === 0 ? 'var(--accent)' : 'var(--text-tertiary)',
              fontFamily: "'DM Mono', monospace",
              flexShrink: 0,
              textAlign: 'right',
            }}
          >
            {i + 1}
          </span>

          {/* bar track */}
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 99,
              background: 'var(--hover-bg)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                width: `${(a.views / max) * 100}%`,
                background:
                  i === 0
                    ? 'var(--accent)'
                    : 'var(--text-tertiary)',
                opacity: i === 0 ? 1 : 0.45 + (1 - i / top.length) * 0.3,
                transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>

          {/* title + views */}
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 140,
              flex: '0 0 auto',
            }}
          >
            {a.title}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: "'DM Mono', monospace",
              flexShrink: 0,
              minWidth: 38,
              textAlign: 'right',
            }}
          >
            {a.views >= 1000 ? `${(a.views / 1000).toFixed(1)}k` : a.views}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OverviewTab({ articles, loading, session, onSwitchArticles }: Props) {
  const totalViews  = articles.reduce((s, a) => s + a.views, 0)
  const avgViews    = articles.length ? Math.round(totalViews / articles.length) : 0
  const featuredCnt = articles.filter(a => a.featured).length

  const initials = session.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'
  const authorSlug = (session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')

  // ── percentage change placeholders (wire up real data when available) ──────
  const stats = [
    { label: 'Articles',  value: articles.length,                 icon: Icons.bookOpen, bg: '#EAF3DE', color: '#3B6D11' },
    { label: 'Total views', value: totalViews.toLocaleString(),   icon: Icons.eye,      bg: '#E6F1FB', color: '#185FA5' },
    { label: 'Avg. views',  value: avgViews.toLocaleString(),     icon: Icons.barChart, bg: '#FAEEDA', color: '#854F0B' },
    { label: 'Featured',    value: featuredCnt,                   icon: Icons.star,     bg: '#FBEAF0', color: '#993556' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {stats.map(s => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
            bg={s.bg}
            color={s.color}
          />
        ))}
      </div>

      {/* ── Row: sparkline + bar chart ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Sparkline card */}
        <Card title="Weekly views">
          <div style={{ padding: '12px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', sans-serif",
                  lineHeight: 1,
                }}
              >
                {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                total views
              </span>
            </div>
            {loading ? (
              <div style={{ height: 72, background: 'var(--hover-bg)', borderRadius: 8 }} />
            ) : (
              <ViewsSparkline articles={articles} />
            )}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
              }}
            >
              {['W1','W2','W3','W4','W5','W6','W7','W8'].map(w => (
                <span key={w} style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Top articles bar chart */}
        <Card
          title="Top articles"
          action={
            <button
              onClick={onSwitchArticles}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                padding: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
            >
              all →
            </button>
          }
        >
          <div style={{ padding: '12px 20px 16px' }}>
            {loading ? (
              <SkeletonRows count={5} height={12} />
            ) : articles.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>
                No data yet
              </p>
            ) : (
              <ArticleBarChart articles={articles} />
            )}
          </div>
        </Card>
      </div>

      {/* ── Author profile + recent articles ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 10 }}>

        {/* Author card */}
        <Card
          title="Profile"
          action={
            <Link
              href={`/author/${authorSlug}`}
              style={{
                fontSize: 11,
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
              public {Icons.chevron}
            </Link>
          }
        >
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
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
                    fontSize: 13,
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
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {session.user.email}
                </p>
              </div>
            </div>

            {/* Role pill */}
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  padding: '3px 8px',
                  borderRadius: 99,
                  background: 'var(--hover-bg)',
                  color: 'var(--text-secondary)',
                  fontFamily: "'DM Mono', monospace",
                  textTransform: 'uppercase',
                }}
              >
                Staff Writer
              </span>
            </div>

            {/* Mini stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                paddingTop: 12,
                borderTop: '0.5px solid var(--border)',
              }}
            >
              {[
                { label: 'Articles', val: articles.length },
                { label: 'Views',    val: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k` : totalViews },
                { label: 'Featured', val: featuredCnt },
                { label: 'Avg/art',  val: avgViews >= 1000 ? `${(avgViews / 1000).toFixed(1)}k` : avgViews },
              ].map(s => (
                <div key={s.label}>
                  <p
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: "'Syne', sans-serif",
                      lineHeight: 1,
                    }}
                  >
                    {s.val}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {s.label}
                  </p>
                </div>
              ))}
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
                fontSize: 11,
                padding: 0,
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
            <SkeletonRows count={5} height={14} />
          ) : articles.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No articles yet.</p>
              <Link
                href="/write"
                style={{
                  marginTop: 10,
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
      </div>

      {/* ── Quick actions ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link
          href="/write"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 14,
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
              width: 36,
              height: 36,
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
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--bg-primary)', fontFamily: "'Syne', sans-serif" }}>
              Write new article
            </p>
            <p style={{ fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.5)' }}>
              Publish to your readers
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', flexShrink: 0, display: 'flex' }}>
            {Icons.chevron}
          </span>
        </Link>

        <Link
          href={`/author/${authorSlug}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '16px 20px',
            borderRadius: 14,
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
              width: 36,
              height: 36,
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
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
              View public profile
            </p>
            <p style={{ fontSize: 11, marginTop: 2, color: 'var(--text-tertiary)' }}>
              See how others see you
            </p>
          </div>
          <span style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', flexShrink: 0, display: 'flex' }}>
            {Icons.chevron}
          </span>
        </Link>
      </div>

    </div>
  )
}