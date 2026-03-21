import Link from 'next/link'
import { Icons } from './icons'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleRow {
  id: string
  title: string
  category: string
  date: Date
  views: number
  slug: string
  featured?: boolean
  breaking?: boolean
  trending?: boolean
  status?: 'draft' | 'published' | 'scheduled' | 'archived'
  seoTitle?: string
  metaDescription?: string
  focusKeyword?: string
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, icon, bg, color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  bg: string
  color: string
}) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
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
          background: bg,
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1,
            color: 'var(--text-primary)',
            fontFamily: "'Syne', sans-serif",
            letterSpacing: '-0.5px',
          }}
        >
          {value}
        </p>
        <p style={{ fontSize: 12, marginTop: 5, color: 'var(--text-tertiary)', fontWeight: 400 }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

export function NavItem({
  icon, label, active, danger, onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        background: active ? 'var(--text-primary)' : 'transparent',
        color: active
          ? 'var(--bg-primary)'
          : danger
          ? '#dc2626'
          : 'var(--text-secondary)',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s, color 0.15s',
        fontFamily: "'DM Sans', sans-serif",
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      <span style={{ opacity: active ? 1 : 0.55, flexShrink: 0, display: 'flex' }}>{icon}</span>
      {label}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  title, action, children, noPadding = false,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  noPadding?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '0.5px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '0.5px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {title}
          </span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const statusStyle: Record<string, { bg: string; text: string }> = {
  published: { bg: '#EAF3DE', text: '#3B6D11' },
  draft:     { bg: '#FAEEDA', text: '#854F0B' },
  scheduled: { bg: '#E6F1FB', text: '#185FA5' },
  archived:  { bg: '#F1EFE8', text: '#5F5E5A' },
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return null
  const s = statusStyle[status] ?? statusStyle.draft
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 99,
        background: s.bg,
        color: s.text,
        fontWeight: 600,
        fontFamily: "'Syne', sans-serif",
        flexShrink: 0,
        letterSpacing: '0.02em',
      }}
    >
      {status}
    </span>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({
  label, bg, color,
}: {
  label: string
  bg: string
  color: string
}) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 8px',
        borderRadius: 99,
        background: bg,
        color,
        fontWeight: 600,
        fontFamily: "'Syne', sans-serif",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

// ─── ArticleRowItem ───────────────────────────────────────────────────────────

export function ArticleRowItem({
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 20px',
        borderBottom: '0.5px solid var(--border)',
        transition: 'background 0.1s',
        cursor: 'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Thumbnail placeholder */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'var(--hover-bg)',
          border: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--text-tertiary)',
        }}
      >
        {Icons.file}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <Link
            href={`/article/${article.slug}`}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              display: 'block',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
          >
            {article.title}
          </Link>
          <StatusPill status={article.status} />
          {article.breaking && <Badge label="Breaking" bg="#FCEBEB" color="#A32D2D" />}
          {article.featured && <Badge label="Featured" bg="#FAEEDA" color="#854F0B" />}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 5,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 6,
              background: 'var(--hover-bg)',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {article.category}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {Icons.eye} {article.views.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {Icons.clock}{' '}
            {new Date(article.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
          {article.focusKeyword && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 6,
                background: '#E6F1FB',
                color: '#185FA5',
                fontWeight: 500,
              }}
              title={`SEO keyword: ${article.focusKeyword}`}
            >
              SEO ✓
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <button
            onClick={() => onEdit?.(article.id)}
            title="Edit"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--hover-bg)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'
            }}
          >
            {Icons.edit}
          </button>
          <button
            onClick={() => onDelete?.(article.id)}
            disabled={deleting === article.id}
            title="Delete"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: deleting === article.id ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)',
              opacity: deleting === article.id ? 0.4 : 1,
              transition: 'background 0.1s, color 0.1s',
            }}
            onMouseEnter={e => {
              if (deleting !== article.id) {
                ;(e.currentTarget as HTMLElement).style.background = '#FCEBEB'
                ;(e.currentTarget as HTMLElement).style.color = '#A32D2D'
              }
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'
            }}
          >
            {Icons.trash}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

export function SkeletonRows({ count = 4, height = 10 }: { count?: number; height?: number }) {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          style={{
            height,
            borderRadius: 8,
            background: 'var(--hover-bg)',
            animation: 'pulse 1.5s ease-in-out infinite',
            opacity: 1 - i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <span
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-tertiary)',
          display: 'flex',
          pointerEvents: 'none',
        }}
      >
        {Icons.search}
      </span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 12px 8px 34px',
          fontSize: 13,
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          outline: 'none',
          transition: 'border-color 0.15s',
          fontFamily: "'DM Sans', sans-serif",
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--text-secondary)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: string[]
  active: string
  onChange: (t: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: 'var(--hover-bg)',
        borderRadius: 10,
        padding: 3,
        width: 'fit-content',
      }}
    >
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '5px 14px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: active === t ? 600 : 400,
            background: active === t ? 'var(--card-bg)' : 'transparent',
            color: active === t ? 'var(--text-primary)' : 'var(--text-secondary)',
            border: active === t ? '0.5px solid var(--border)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}