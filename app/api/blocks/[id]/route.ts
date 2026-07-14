import { NextRequest, NextResponse } from 'next/server'
import { updateCustomBlock, deleteCustomBlock } from '@/lib/db/blocks'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ error: 'Custom block system is disabled.' }, { status: 403 });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json({ error: 'Custom block system is disabled.' }, { status: 403 });
}
