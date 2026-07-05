import { NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/lib/db/settings'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
    console.error('Unauthorized access attempt to settings API:', session?.user);
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'admin') {
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
