import { NextResponse } from 'next/server'
import { getAllHomeSections, createHomeSection, updateHomeSection, deleteHomeSection, updateHomeSectionsOrder } from '@/lib/db/home-sections'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const sections = await getAllHomeSections()
    return NextResponse.json(sections)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch home sections' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()

    if (Array.isArray(body)) {
      // Reordering
      await updateHomeSectionsOrder(body)
      return NextResponse.json({ success: true })
    }

    const section = await createHomeSection(body)
    return NextResponse.json(section)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create home section' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, ...data } = body
    await updateHomeSection(id, data)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update home section' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return new NextResponse('ID required', { status: 400 })

    await deleteHomeSection(parseInt(id))
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete home section' }, { status: 500 })
  }
}
