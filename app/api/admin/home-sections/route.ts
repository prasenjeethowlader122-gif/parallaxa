
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
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sections = await getAllHomeSections();
  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();

  if (data.action === 'reorder') {
    await reorderHomeSections(data.ids);
    return NextResponse.json({ success: true });
  }

  const newSection = await createHomeSection(data);
  return NextResponse.json(newSection[0]);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  const { id, ...rest } = data;
  const updatedSection = await updateHomeSection(id, rest);
  return NextResponse.json(updatedSection[0]);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get('id') || '');

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  await deleteHomeSection(id);
  return NextResponse.json({ success: true });
}
