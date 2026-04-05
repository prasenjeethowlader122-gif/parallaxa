/**
 * app/api/articles/route.ts
 *
 * GET  — public published articles (unchanged)
 * POST — DAL দিয়ে create, user_id সবসময় session থেকে
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPublishedArticles } from '@/lib/db/articles'
import { dal } from '@/lib/db/dal'

export async function GET() {
  try {
    const articles = await getPublishedArticles()
    return NextResponse.json(articles)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const body = await req.json()
    
    // user_id সবসময় session থেকে নেওয়া হচ্ছে — body.user_id কখনো trust করা হচ্ছে না
    const article = await dal.createArticle(session.user.id, {
      title: body.title,
      description: body.description,
      content: body.content,
      category: body.category,
      author: session.user.name ?? session.user.email ?? 'Anonymous',
      date: new Date(body.date ?? Date.now()),
      image: body.image ?? '',
      readTime: body.readTime ?? 3,
      featured: body.featured ?? false,
      breaking: body.breaking ?? false,
      trending: body.trending ?? false,
      seoTitle: body.seoTitle ?? null,
      metaDescription: body.metaDescription ?? null,
      focusKeyword: body.focusKeyword ?? null,
      canonicalUrl: body.canonicalUrl ?? null,
      ogImage: body.ogImage ?? null,
      twitterCard: body.twitterCard ?? 'summary_large_image',
      noIndex: body.noIndex ?? false,
      allowComments: body.allowComments ?? true,
      showInRss: body.showInRss ?? true,
      ampEnabled: body.ampEnabled ?? false,
      redirectUrl: body.redirectUrl ?? null,
      cssClass: body.cssClass ?? null,
      visibility: body.visibility ?? 'public',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      status: body.status ?? 'draft',
    })
    
    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 })
  }
}