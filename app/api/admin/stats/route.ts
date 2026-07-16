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
      SELECT id, title, views, date AS created_at
      FROM articles
      ORDER BY date DESC
      LIMIT 5
    `;

    // Category distribution stats
    const categoryStatsRows = await sql`
      SELECT category, COUNT(*) as count, COALESCE(SUM(views), 0) as total_views
      FROM articles
      GROUP BY category
      ORDER BY count DESC
    `;
    const categoryStats = categoryStatsRows.map(row => ({
      label: row.category || 'Uncategorized',
      value: parseInt(row.count || '0'),
      secondaryValue: parseInt(row.total_views || '0')
    }));

    // Trends stats (past 14 days)
    const trendStatsRows = await sql`
      SELECT TO_CHAR(date, 'YYYY-MM-DD') as day, COALESCE(SUM(views), 0) as views_count, COUNT(*) as articles_count
      FROM articles
      GROUP BY day
      ORDER BY day DESC
      LIMIT 14
    `;
    const trendStats = trendStatsRows.map(row => ({
      day: row.day,
      views: parseInt(row.views_count || '0'),
      articles: parseInt(row.articles_count || '0')
    })).reverse(); // Oldest first for the chart

    return NextResponse.json({
      stats: {
        articles: parseInt(articleCount[0].count || '0'),
        views: parseInt(viewCount[0].sum || '0'),
        users: parseInt(userCount[0].count || '0')
      },
      recentArticles,
      categoryStats,
      trendStats
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
