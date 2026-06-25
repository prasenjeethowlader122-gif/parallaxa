import { NextRequest, NextResponse } from 'next/server'
import { updateCustomBlock, deleteCustomBlock } from '@/lib/db/blocks'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const body = await req.json()
    const { label, description, icon, params: blockParams, htmlTemplate } = body

    const block = await updateCustomBlock(id, {
      label,
      description,
      icon,
      params: blockParams,
      htmlTemplate,
    })
    return NextResponse.json(block)
  } catch (e: any) {
    console.error('[blocks PUT]', e)
    if (e?.message?.includes('not found')) {
      return NextResponse.json({ error: 'Block not found or is a built-in block' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    await deleteCustomBlock(id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[blocks DELETE]', e)
    if (e?.message?.includes('not found')) {
      return NextResponse.json({ error: 'Block not found or is a built-in block' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete block' }, { status: 500 })
  }
}
