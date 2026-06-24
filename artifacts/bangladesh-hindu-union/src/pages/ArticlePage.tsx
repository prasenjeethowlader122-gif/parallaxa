import { useParams } from 'wouter'
import ArticlePageClient from '@/hooks/client/article-page'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function ArticlePage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <ArticlePageClient slug={slug} />
    </div>
  )
}
