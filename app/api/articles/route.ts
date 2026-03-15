import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createArticle, getAllArticles } from '@/lib/db/articles'

export async function GET() {
  try {
    const articles = await getAllArticles()
    return NextResponse.json(articles)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    const article = await createArticle({
      // Core fields
      title:       body.title,
      description: body.description,
      content:     body.content,
      category:    body.category,
      author:      session.user.name ?? session.user.email ?? 'Anonymous',
      date:        new Date(body.date ?? Date.now()),
      image:       body.image       ?? '',
      readTime:    body.readTime    ?? 3,
      featured:    body.featured    ?? false,
      breaking:    body.breaking    ?? false,
      trending:    body.trending    ?? false,
      // SEO fields
      seoTitle:        body.seoTitle        ?? null,
      metaDescription: body.metaDescription ?? null,
      focusKeyword:    body.focusKeyword    ?? null,
      canonicalUrl:    body.canonicalUrl    ?? null,
      ogImage:         body.ogImage         ?? null,
      twitterCard:     body.twitterCard     ?? 'summary_large_image',
      // Advanced fields
      noIndex:       body.noIndex       ?? false,
      allowComments: body.allowComments ?? true,
      showInRss:     body.showInRss     ?? true,
      ampEnabled:    body.ampEnabled    ?? false,
      redirectUrl:   body.redirectUrl   ?? null,
      cssClass:      body.cssClass      ?? null,
      visibility:    body.visibility    ?? 'public',
      scheduledAt:   body.scheduledAt   ? new Date(body.scheduledAt) : undefined,
      user_id: session.user.id,
      status:        body.status        ?? 'draft',
    })

    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}
