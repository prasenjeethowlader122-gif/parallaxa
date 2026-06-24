import { NextRequest, NextResponse } from 'next/server'
import { getArticleBySlug } from '@/lib/db/articles'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const article = await getArticleBySlug(slug)
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }
    return NextResponse.json(article)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }
}
