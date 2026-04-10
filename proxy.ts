// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'ar', 'bn', 'zh']
const DEFAULT_LOCALE = 'en'

const COUNTRY_TO_LOCALE: Record<string, string> = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en',
  FR: 'fr', BE: 'fr',
  DE: 'de', AT: 'de',
  ES: 'es', MX: 'es', CO: 'es', CL: 'es',
  SA: 'ar', AE: 'ar', EG: 'ar', QA: 'ar',
  BD: 'bn',
  CN: 'zh', TW: 'zh', HK: 'zh',
}

function resolveLocale(req: NextRequest): string {
  // 1st — user cookie
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale
  }

  // 2nd — GeoIP
  const country = req.headers.get('x-vercel-ip-country') ?? ''
  const geoLocale = COUNTRY_TO_LOCALE[country]
  if (geoLocale) return geoLocale

  // 3rd — browser Accept-Language
  const acceptLang = req.headers.get('accept-language') ?? ''
  const browserLang = acceptLang.split(',')[0].split('-')[0].toLowerCase()
  if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang

  return DEFAULT_LOCALE
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip if locale already present
  const hasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  
  if (hasLocale) return NextResponse.next()  // ← explicit next(), not bare return
  if(pathname.startsWith(`/ai/`)) return NextResponse.next()
  const locale = resolveLocale(req)
  req.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(req.nextUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api|favicon.ico|placeholder|icons|images|fonts|.*\\..*).*)',
  ],
}