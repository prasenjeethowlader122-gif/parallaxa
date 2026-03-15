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
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
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
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left transition-all duration-150"
      style={{
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

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  title, action, children,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      {title && (
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── ArticleRow ───────────────────────────────────────────────────────────────

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
      className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-100"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex-1 min-w-0">
        <Link
          href={`/article/${article.slug}`}
          className="text-sm font-medium block truncate hover:underline"
          style={{ color: 'var(--text-primary)' }}
        >
          {article.title}
        </Link>
        <div
          className="flex items-center gap-2 mt-1 flex-wrap"
          style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
        >
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

// ─── Skeleton loader ──────────────────────────────────────────────────────────

export function SkeletonRows({ count = 4, height = 10 }: { count?: number; height?: number }) {
  return (
    <div className="p-5 space-y-2.5">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`h-${height} rounded-md animate-pulse`}
          style={{ background: 'var(--hover-bg)' }}
        />
      ))}
    </div>
  )
}
