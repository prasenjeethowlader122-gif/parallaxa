import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { authOptions } from '@/auth'
import { sql } from '@/lib/db/index'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    const authorName = session.user.name ?? session.user.email ?? ''
    const rows = await sql`
      SELECT * FROM articles WHERE author = ${authorName} ORDER BY date DESC
    `
    return NextResponse.json(rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      author: r.author,
      date: r.date,
      image: r.image,
      readTime: r.read_time,
      featured: r.featured,
      breaking: r.breaking,
      trending: r.trending,
      views: r.views,
      slug: r.slug,
    })))
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}