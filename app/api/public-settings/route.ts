import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/db/settings'

export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json({
      mobile_menu_links: settings.mobile_menu_links
    })
  } catch (err) {
    console.error('Failed to fetch public settings:', err)
    return NextResponse.json({ error: 'Failed to fetch public settings' }, { status: 500 })
  }
}
