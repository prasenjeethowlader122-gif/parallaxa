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

// ─── Sparkline (pure SVG, no deps) ───────────────────────────────────────────
function ViewsSparkline({ articles }: { articles: ArticleRow[] }) {
  const data = useMemo(() => {
    const now  = Date.now()
    const WEEK = 7 * 24 * 60 * 60 * 1000
    const buckets = Array.from({ length: 8 }, (_, i) => ({
      views: 0,
      start: now - (8 - i) * WEEK,
      end:   now - (7 - i) * WEEK,
    }))
    articles.forEach(a => {
      const ts = new Date(a.date ?? '').getTime()
      const b  = buckets.find(bk => ts >= bk.start && ts < bk.end)
      if (b) b.views += a.views
    })
    return buckets
  }, [articles])

  const max  = Math.max(...data.map(d => d.views), 1)
  const W = 280, H = 60, P = 6
  const pts = data.map((d, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2)
    const y = H - P - (d.views / max) * (H - P * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const area = `${P},${H - P} ${pts.join(' ')} ${W - P},${H - P}`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sg)" />
      <polyline
        points={pts.join(' ')} fill="none"
        stroke="var(--accent)" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {pts[pts.length - 1] && (() => {
        const [cx, cy] = pts[pts.length - 1].split(',')
        return (
          <>
            <circle cx={cx} cy={cy} r="4" fill="var(--card-bg)" stroke="var(--accent)" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="2" fill="var(--accent)" />
          </>
        )
      })()}
    </svg>
  )
}

// ─── Horizontal bar chart: top articles ──────────────────────────────────────
function ArticleBarChart({ articles }: { articles: ArticleRow[] }) {
  const top = useMemo(
    () => [...articles].sort((a, b) => b.views - a.views).slice(0, 5),
    [articles]
  )
  const max = Math.max(...top.map(a => a.views), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {top.map((a, i) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 18,
            fontSize: 11,
            fontWeight: 700,
            color: i === 0 ? 'var(--accent)' : 'var(--text-tertiary)',
            fontFamily: "'DM Mono', monospace",
            flexShrink: 0,
            textAlign: 'right',
          }}>
            {i + 1}
          </span>

          <div style={{ flex: 1, position: 'relative', height: 5, borderRadius: 99, background: 'var(--hover-bg)', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0,
              width: `${(a.views / max) * 100}%`,
              background: i === 0
                ? 'linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 70%, transparent) 100%)'
                : 'var(--text-tertiary)',
              opacity: i === 0 ? 1 : Math.max(0.25, 0.55 - i * 0.08),
              borderRadius: 99,
              transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>

          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6,
            flexShrink: 0,
            minWidth: 120,
          }}>
            <span style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 90,
            }}>
              {a.title}
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: "'DM Mono', monospace",
              marginLeft: 'auto',
              flexShrink: 0,
            }}>
              {a.views >= 1000 ? `${(a.views / 1000).toFixed(1)}k` : a.views}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Stat card with accent bar ────────────────────────────────────────────────
function MetricCard({ label, value, icon, accentBg, accentColor, trend }: {
  label: string
  value: string | number
  icon: React.ReactNode
  accentBg: string
  accentColor: string
  trend?: string
}) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '0.5px solid var(--border)',
      borderRadius: 16,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.18s, box-shadow 0.18s',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'translateY(-2px)'
      el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'translateY(0)'
      el.style.boxShadow = 'none'
    }}
    >
      {/* Accent corner blob */}
      <div style={{
        position: 'absolute',
        top: -16, right: -16,
        width: 72, height: 72,
        borderRadius: '50%',
        background: accentBg,
        opacity: 0.35,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 36, height: 36,
        borderRadius: 10,
        background: accentBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentColor,
        flexShrink: 0,
      }}>
        {icon}
      </div>

      <div>
        <p style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: "'Syne', sans-serif",
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}>
          {value}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</p>
          {trend && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: accentColor,
              background: accentBg,
              padding: '2px 7px',
              borderRadius: 99,
              fontFamily: "'DM Mono', monospace",
            }}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--text-secondary)',
        fontFamily: "'DM Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
      }}>
        {children}
      </h3>
      {action}
    </div>
  )
}

function SeeAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-tertiary)',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11, padding: 0,
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
    >
      See all →
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OverviewTab({ articles, loading, session, onSwitchArticles }: Props) {
  const totalViews  = articles.reduce((s, a) => s + a.views, 0)
  const avgViews    = articles.length ? Math.round(totalViews / articles.length) : 0
  const featuredCnt = articles.filter(a => a.featured).length

  const initials  = session.user.name
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.user.email?.charAt(0).toUpperCase() ?? 'U'
  const authorSlug = (session.user.name ?? '').toLowerCase().replace(/\s+/g, '-')

  const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

  const metrics = [
    {
      label: 'Total articles',  value: articles.length,
      icon: Icons.bookOpen, accentBg: '#EAF3DE', accentColor: '#3B6D11',
    },
    {
      label: 'Total views',     value: fmtNum(totalViews),
      icon: Icons.eye, accentBg: '#E6F1FB', accentColor: '#185FA5',
    },
    {
      label: 'Avg. views',      value: fmtNum(avgViews),
      icon: Icons.barChart, accentBg: '#FAEEDA', accentColor: '#854F0B',
    },
    {
      label: 'Featured',        value: featuredCnt,
      icon: Icons.star, accentBg: '#FBEAF0', accentColor: '#993556',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Welcome bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 22px',
        background: 'var(--text-primary)',
        borderRadius: 18,
        gap: 16,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Dashboard
          </p>
          <h2 style={{
            margin: '4px 0 0',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            fontFamily: "'Syne', sans-serif",
            letterSpacing: '-0.3px',
          }}>
            Good {getGreeting()}, {session.user.name?.split(' ')[0] ?? 'there'} 👋
          </h2>
        </div>
        <Link
          href="/write"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 18px',
            background: 'rgba(255,255,255,0.12)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            color: '#fff',
            fontSize: 13, fontWeight: 600,
            textDecoration: 'none',
            fontFamily: "'Syne', sans-serif",
            flexShrink: 0,
            transition: 'background 0.15s',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.2)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)')}
        >
          {Icons.edit} Write article
        </Link>
      </div>

      {/* ── Metric cards ── */}
      <div>
        <SectionHeading>Overview</SectionHeading>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
        }}>
          {metrics.map(m => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </div>

      {/* ── Analytics row ── */}
      <div>
        <SectionHeading>Analytics</SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Sparkline card */}
          <div style={{
            background: 'var(--card-bg)',
            border: '0.5px solid var(--border)',
            borderRadius: 16,
            padding: '20px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Weekly views</p>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: 28, fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', sans-serif",
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                }}>
                  {fmtNum(totalViews)}
                </p>
              </div>
            </div>
            {loading ? (
              <div style={{ height: 60, background: 'var(--hover-bg)', borderRadius: 8 }} />
            ) : (
              <ViewsSparkline articles={articles} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['W1','W2','W3','W4','W5','W6','W7','W8'].map(w => (
                <span key={w} style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: "'DM Mono', monospace" }}>
                  {w}
                </span>
              ))}
            </div>
          </div>

          {/* Top articles */}
          <div style={{
            background: 'var(--card-bg)',
            border: '0.5px solid var(--border)',
            borderRadius: 16,
            padding: '20px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Top articles</p>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: 28, fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: "'Syne', sans-serif",
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                }}>
                  {articles.length}
                </p>
              </div>
              <SeeAllButton onClick={onSwitchArticles} />
            </div>
            {loading ? (
              <SkeletonRows count={5} height={10} />
            ) : articles.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>
                No data yet
              </p>
            ) : (
              <ArticleBarChart articles={articles} />
            )}
          </div>
        </div>
      </div>

      {/* ── Profile + Recent articles ── */}
      <div>
        <SectionHeading action={<SeeAllButton onClick={onSwitchArticles} />}>
          Recent activity
        </SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12 }}>

          {/* Author card */}
          <div style={{
            background: 'var(--card-bg)',
            border: '0.5px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {/* Top accent */}
            <div style={{
              height: 56,
              background: 'var(--hover-bg)',
              borderBottom: '0.5px solid var(--border)',
              position: 'relative',
            }} />

            <div style={{ padding: '0 20px 20px', marginTop: -22 }}>
              {/* Avatar */}
              <div style={{
                width: 48, height: 48,
                borderRadius: '50%',
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700,
                fontFamily: "'Syne', sans-serif",
                border: '3px solid var(--card-bg)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                marginBottom: 12,
              }}>
                {initials}
              </div>

              <p style={{
                margin: 0,
                fontSize: 15, fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: "'Syne', sans-serif",
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {session.user.name ?? 'Anonymous'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.email}
              </p>

              <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  padding: '3px 10px', borderRadius: 99,
                  background: 'var(--hover-bg)', color: 'var(--text-secondary)',
                  fontFamily: "'DM Mono', monospace",
                }}>
                  Staff Writer
                </span>
              </div>

              {/* Mini stats grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 12, paddingTop: 14,
                borderTop: '0.5px solid var(--border)',
              }}>
                {[
                  { label: 'Articles', val: articles.length },
                  { label: 'Views',    val: fmtNum(totalViews) },
                  { label: 'Featured', val: featuredCnt },
                  { label: 'Avg/art',  val: fmtNum(avgViews) },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
                      {s.val}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-tertiary)' }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href={`/author/${authorSlug}`}
                style={{
                  marginTop: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: '0.5px solid var(--border)',
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  fontFamily: "'Syne', sans-serif',",
                  transition: 'border-color 0.15s, color 0.15s',
                  background: 'var(--hover-bg)',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--text-secondary)'
                  el.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = 'var(--border)'
                  el.style.color = 'var(--text-secondary)'
                }}
              >
                {Icons.trending} Public profile {Icons.chevron}
              </Link>
            </div>
          </div>

          {/* Recent articles */}
          <div style={{
            background: 'var(--card-bg)',
            border: '0.5px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Syne', sans-serif" }}>
                Recent articles
              </p>
            </div>

            {loading ? (
              <div style={{ padding: '8px 0' }}>
                <SkeletonRows count={5} height={14} />
              </div>
            ) : articles.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>No articles yet.</p>
                <Link
                  href="/write"
                  style={{
                    marginTop: 10,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 500,
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
          </div>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div>
        <SectionHeading>Quick actions</SectionHeading>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <QuickAction
            href="/write"
            icon={Icons.edit}
            title="Write new article"
            subtitle="Publish to your readers"
            variant="primary"
          />
          <QuickAction
            href={`/author/${authorSlug}`}
            icon={Icons.trending}
            title="View public profile"
            subtitle="See how others see you"
            variant="secondary"
          />
        </div>
      </div>

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function QuickAction({ href, icon, title, subtitle, variant }: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
  variant: 'primary' | 'secondary'
}) {
  const isPrimary = variant === 'primary'
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '18px 20px',
        borderRadius: 16,
        background: isPrimary ? 'var(--text-primary)' : 'var(--card-bg)',
        border: `0.5px solid ${isPrimary ? 'var(--text-primary)' : 'var(--border)'}`,
        textDecoration: 'none',
        transition: 'opacity 0.2s, transform 0.18s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        if (isPrimary) el.style.opacity = '0.88'
        else el.style.borderColor = 'var(--text-secondary)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        if (isPrimary) el.style.opacity = '1'
        else el.style.borderColor = 'var(--border)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        width: 40, height: 40,
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        background: isPrimary ? 'rgba(255,255,255,0.12)' : 'var(--hover-bg)',
        color: isPrimary ? '#fff' : 'var(--text-secondary)',
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 700,
          color: isPrimary ? '#fff' : 'var(--text-primary)',
          fontFamily: "'Syne', sans-serif",
          letterSpacing: '0.01em',
        }}>
          {title}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: isPrimary ? 'rgba(255,255,255,0.45)' : 'var(--text-tertiary)' }}>
          {subtitle}
        </p>
      </div>
      <span style={{
        marginLeft: 'auto', flexShrink: 0, display: 'flex',
        color: isPrimary ? 'rgba(255,255,255,0.3)' : 'var(--text-tertiary)',
      }}>
        {Icons.chevron}
      </span>
    </Link>
  )
}