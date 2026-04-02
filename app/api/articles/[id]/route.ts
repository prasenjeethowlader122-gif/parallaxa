import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getArticleById, updateArticle, deleteArticle } from '@/lib/db/articles'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const article = await getArticleById(decodeURIComponent(id))
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(article)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()

    const article = await updateArticle(id, {
      // Core
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.content     !== undefined && { content:     body.content }),
      ...(body.category    !== undefined && { category:    body.category }),
      ...(body.image       !== undefined && { image:       body.image }),
      ...(body.readTime    !== undefined && { readTime:    body.readTime }),
      ...(body.featured    !== undefined && { featured:    body.featured }),
      ...(body.breaking    !== undefined && { breaking:    body.breaking }),
      ...(body.trending    !== undefined && { trending:    body.trending }),
      ...(body.date        !== undefined && { date:        new Date(body.date) }),
      // SEO
      ...(body.seoTitle        !== undefined && { seoTitle:        body.seoTitle }),
      ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription }),
      ...(body.focusKeyword    !== undefined && { focusKeyword:    body.focusKeyword }),
      ...(body.canonicalUrl    !== undefined && { canonicalUrl:    body.canonicalUrl }),
      ...(body.ogImage         !== undefined && { ogImage:         body.ogImage }),
      ...(body.twitterCard     !== undefined && { twitterCard:     body.twitterCard }),
      // Advanced
      ...(body.noIndex       !== undefined && { noIndex:       body.noIndex }),
      ...(body.allowComments !== undefined && { allowComments: body.allowComments }),
      ...(body.showInRss     !== undefined && { showInRss:     body.showInRss }),
      ...(body.ampEnabled    !== undefined && { ampEnabled:    body.ampEnabled }),
      ...(body.redirectUrl   !== undefined && { redirectUrl:   body.redirectUrl }),
      ...(body.cssClass      !== undefined && { cssClass:      body.cssClass }),
      ...(body.visibility    !== undefined && { visibility:    body.visibility }),
      ...(body.status        !== undefined && { status:        body.status }),
      ...(body.scheduledAt   !== undefined && {
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      }),
    })

    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(article)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const deleted = await deleteArticle(id)
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
