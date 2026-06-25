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
  try {
    const body = await req.json()
    const { name, label, description, icon, params, htmlTemplate } = body

    if (!name || !label || !htmlTemplate) {
      return NextResponse.json({ error: 'name, label, htmlTemplate are required' }, { status: 400 })
    }

    const nameClean = (name as string).toLowerCase().replace(/[^a-z0-9_-]/g, '')
    if (!nameClean) {
      return NextResponse.json({ error: 'Invalid block name' }, { status: 400 })
    }

    const block = await createCustomBlock({
      name: nameClean,
      label,
      description: description ?? '',
      icon: icon ?? '🧩',
      params: params ?? [],
      htmlTemplate,
    })
    return NextResponse.json(block, { status: 201 })
  } catch (e: any) {
    console.error('[blocks POST]', e)
    if (e?.message?.includes('duplicate key') || e?.message?.includes('unique')) {
      return NextResponse.json({ error: 'এই নামে ব্লক আগে থেকেই আছে' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create block' }, { status: 500 })
  }
}
