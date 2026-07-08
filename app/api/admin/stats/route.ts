
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sql } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const articleCount = await sql`SELECT COUNT(*) FROM articles`;
    const viewCount = await sql`SELECT SUM(views) FROM articles`;
    const userCount = await sql`SELECT COUNT(*) FROM users`;

    // Recent activity
    const recentArticles = await sql`
      SELECT id, title, views, created_at
      FROM articles
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      stats: {
        articles: parseInt(articleCount[0].count),
        views: parseInt(viewCount[0].sum || '0'),
        users: parseInt(userCount[0].count)
      },
      recentArticles
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
