
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { addComment, getComments, deleteComment } from '@/lib/db/engagement';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId') || '';

    if (!articleId) {
      return NextResponse.json({ error: 'Invalid articleId' }, { status: 400 });
    }

    const comments = await getComments(articleId);
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Failed to get comments:', error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { articleId, content } = await req.json();

    if (!articleId || !content) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const comment = await addComment(
      articleId,
      session.user.id,
      session.user.name || 'Anonymous',
      session.user.image || '',
      content
    );

    return NextResponse.json(comment?.[0] || null);
  } catch (error) {
    console.error('Failed to post comment:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '');

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteComment(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
