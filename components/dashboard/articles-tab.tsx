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
        <SkeletonRows count={6} height={14} />
      ) : articles.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No articles yet.</p>
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
