// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'ar', 'bn', 'zh']
const DEFAULT_LOCALE = 'bn'

const COUNTRY_TO_LOCALE: Record<string, string> = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en',
  FR: 'fr', BE: 'fr',
  DE: 'de', AT: 'de',
  ES: 'es', MX: 'es', CO: 'es', CL: 'es',
  SA: 'ar', AE: 'ar', EG: 'ar', QA: 'ar',
  BD: 'bn',
  CN: 'zh', TW: 'zh', HK: 'zh',
}

// Routes that require authentication (matched against pathname WITHOUT locale prefix)
const PROTECTED_SEGMENTS = ['/dashboard', '/write']

function resolveLocale(req: NextRequest): string {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) return cookieLocale

  const country = req.headers.get('x-vercel-ip-country') ?? ''
  const geoLocale = COUNTRY_TO_LOCALE[country]
  if (geoLocale) return geoLocale

  const acceptLang = req.headers.get('accept-language') ?? ''
  const browserLang = acceptLang.split(',')[0].split('-')[0].toLowerCase()
  if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang

  return DEFAULT_LOCALE
}

function stripLocale(pathname: string): string {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return pathname.slice(locale.length + 1) || '/'
    }
  }
  return pathname
}

function isProtected(pathname: string): boolean {
  const bare = stripLocale(pathname)
  return PROTECTED_SEGMENTS.some(
    (seg) => bare === seg || bare.startsWith(seg + '/')
  )
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. Skip static assets, API routes, AI routes (no locale, no auth check needed)
  // /ai/* paths are excluded from locale redirect already handled below

  // 2. Auth guard — runs before locale redirect so the redirect URL is clean
  if (isProtected(pathname)) {
    const session = await auth()
    if (!session?.user) {
      const signinUrl = req.nextUrl.clone()
      signinUrl.pathname = '/auth/signin'
      signinUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signinUrl)
    }
  }

  // 3. Skip locale injection for /ai/* paths
  if (pathname.startsWith('/ai/') || pathname === '/ai') {
    return NextResponse.next()
  }

  // 4. Locale redirect — skip if locale already present
  const hasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )
  if (hasLocale) return NextResponse.next()

  const locale = resolveLocale(req)
  req.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(req.nextUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api|favicon.ico|placeholder|icons|images|fonts|.*\\..*).*)',
  ],
}