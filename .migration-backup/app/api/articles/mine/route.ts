/**
 * app/api/articles/mine/route.ts
 *
 * শুধু authenticated user এর নিজের articles।
 * DAL ব্যবহার করে — অন্যের data কখনো আসবে না।
 */

import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/auth'
import { dal } from '@/lib/db/dal'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '12'), 100) // max 100 cap
  const page   = Math.max(parseInt(searchParams.get('page')   || '1'),  1)
  const status = searchParams.get('status') as any ?? undefined

  try {
    const [articles, total] = await Promise.all([
      status
        ? dal.getMyArticlesByStatus(session.user.id, status, { limit, page })
        : dal.getMyArticles(session.user.id, { limit, page }),
      dal.countMyArticles(session.user.id),
    ])

    return NextResponse.json({
      articles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (e) {
    console.error('[/api/articles/mine]', e)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}