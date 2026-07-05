import { NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/lib/db/settings'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const settings = await getSettings()
  return NextResponse.json(settings)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const body = await req.json()
    await updateSettings(body)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
