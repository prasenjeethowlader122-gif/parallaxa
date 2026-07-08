import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const [articlesCount, viewsCount] = await Promise.all([
      sql`SELECT COUNT(*) FROM articles`,
      sql`SELECT SUM(views) FROM articles`
    ])

    return NextResponse.json({
      articles: articlesCount[0].count,
      views: viewsCount[0].sum || 0
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
