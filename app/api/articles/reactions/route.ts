
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addReaction, getArticleReactions, getUserReaction } from '@/lib/db/engagement';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId') || '';

    if (!articleId) {
      return NextResponse.json({ error: 'Invalid articleId' }, { status: 400 });
    }

    const reactions = await getArticleReactions(articleId);

    const session = await auth();
    let userReaction = null;
    if (session?.user?.id) {
      userReaction = await getUserReaction(articleId, session.user.id);
    }

    return NextResponse.json({ ...reactions, userReaction });
  } catch (error) {
    console.error('Failed to get reactions:', error);
    return NextResponse.json({ likes: 0, dislikes: 0, userReaction: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId, type } = await req.json();

    if (!articleId || !['like', 'dislike'].includes(type)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await addReaction(articleId, session.user.id, type);
    const updatedReactions = await getArticleReactions(articleId);

    return NextResponse.json(updatedReactions);
  } catch (error) {
    console.error('Failed to post reaction:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
