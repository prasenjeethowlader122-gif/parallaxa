import { NextRequest, NextResponse } from 'next/server'
import { getAllCustomBlocks, getUserCustomBlocks, createCustomBlock } from '@/lib/db/blocks'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userOnly = searchParams.get('user') === '1'
    const blocks = userOnly ? await getUserCustomBlocks() : await getAllCustomBlocks()
    return NextResponse.json(blocks)
  } catch (e) {
    console.error('[blocks GET]', e)
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Custom block system is disabled.' }, { status: 403 });
}
