// route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  getAllHomeSections,
  createHomeSection,
  updateHomeSection,
  deleteHomeSection,
  reorderHomeSections
} from '@/lib/db/sections';

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sections = await getAllHomeSections();
  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();

  try {
    if (data.action === 'reorder') {
      if (!Array.isArray(data.ids) || data.ids.length === 0) {
        return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
      }
      await reorderHomeSections(data.ids);
      return NextResponse.json({ success: true });
    }

    // Basic validation before touching the DB — catches empty titles,
    // missing category selection, and non-numeric limits up front instead
    // of letting them silently fail as a DB constraint violation.
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (data.type === 'category' && !data.category_id) {
      return NextResponse.json({ error: 'Category is required for category sections' }, { status: 400 });
    }
    if (typeof data.limit_count !== 'number' || !Number.isFinite(data.limit_count) || data.limit_count <= 0) {
      return NextResponse.json({ error: 'limit_count must be a positive number' }, { status: 400 });
    }

    const newSection = await createHomeSection(data);

    // createHomeSection no longer swallows errors, but it can still return
    // an empty result set in edge cases — guard against that explicitly
    // instead of returning `undefined` with a 200 status.
    if (!newSection || newSection.length === 0) {
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }

    return NextResponse.json(newSection[0]);
  } catch (e) {
    console.error('POST /api/admin/home-sections failed:', e);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  const { id, ...rest } = data;

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
  }

  try {
    const updatedSection = await updateHomeSection(id, rest);

    if (!updatedSection || updatedSection.length === 0) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSection[0]);
  } catch (e) {
    console.error('PUT /api/admin/home-sections failed:', e);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '');

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await deleteHomeSection(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/admin/home-sections failed:', e);
    return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
  }
}