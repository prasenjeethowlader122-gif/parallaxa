import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sql } from '@/lib/db/index'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  try {
    console.log('SESSION USER:', session.user) // debug — পরে সরাও
    
    const rows = await sql`
      SELECT * FROM articles
      WHERE user_id = ${session.user.id}
      ORDER BY date DESC
    `
    return NextResponse.json(
      rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        content: r.content,
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
        status: r.status,
        visibility: r.visibility,
        seoTitle: r.seo_title,
        metaDescription: r.meta_description,
        focusKeyword: r.focus_keyword,
        canonicalUrl: r.canonical_url,
        ogImage: r.og_image,
        twitterCard: r.twitter_card,
        noIndex: r.no_index,
        allowComments: r.allow_comments,
        showInRss: r.show_in_rss,
        ampEnabled: r.amp_enabled,
        redirectUrl: r.redirect_url,
        cssClass: r.css_class,
        scheduledAt: r.scheduled_at,
        updatedAt: r.updated_at,
      }))
    )
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to fetch your articles' }, { status: 500 })
  }
}