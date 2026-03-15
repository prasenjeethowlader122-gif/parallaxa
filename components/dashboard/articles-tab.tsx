import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icons } from './icons'
import { Card, ArticleRowItem, SkeletonRows, type ArticleRow } from './ui'

interface Props {
  articles: ArticleRow[]
  loading: boolean
  deleting: string | null
  onDelete: (id: string) => void
}

export function ArticlesTab({ articles, loading, deleting, onDelete }: Props) {
  const router = useRouter()

  const byStatus = {
    published: articles.filter(a => a.status === 'published').length,
    draft:     articles.filter(a => a.status === 'draft').length,
    scheduled: articles.filter(a => a.status === 'scheduled').length,
  }

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
      {/* Status summary pills */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: 'Published', count: byStatus.published, bg: '#EAF3DE', text: '#3B6D11' },
          { label: 'Draft',     count: byStatus.draft,     bg: '#FAEEDA', text: '#854F0B' },
          { label: 'Scheduled', count: byStatus.scheduled, bg: '#E6F1FB', text: '#185FA5' },
        ].map(s => (
          <span
            key={s.label}
            style={{
              fontSize: 11,
              padding: '2px 9px',
              borderRadius: 20,
              background: s.bg,
              color: s.text,
              fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
            }}
          >
            {s.count} {s.label}
          </span>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={6} height={14} />
      ) : articles.length === 0 ? (
        <div className="py-14 text-center">
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
          {articles.map(a => (
            <ArticleRowItem
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
