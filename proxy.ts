/**
 * middleware.ts  (project root)
 *
 * Runs on every matched request at the edge before any page or API
 * route handler executes.  Responsibilities:
 *
 *  1. Authentication guard  — redirect unauthenticated users away from
 *     protected routes; redirect logged-in users away from auth pages.
 *
 *  2. Security headers  — applied to every response regardless of auth
 *     state (CSP, HSTS, X-Frame-Options, etc.).
 *
 *  3. Edge rate limiting  — simple sliding-window counter stored in a
 *     Map (per-isolate memory).  Protects the AI chat and pipeline
 *     endpoints from abuse without an external store.
 *     Note: because each edge isolate has its own memory, this is
 *     "per-instance" rate limiting, not globally coordinated.  For
 *     production you should back this with Vercel KV or Upstash Redis.
 *
 *  4. Bot / AI-crawler block  — honoured here in addition to robots.txt
 *     because robots.txt is advisory and bad actors ignore it.
 *
 *  5. Admin role guard  — the /admin/* subtree requires the user to
 *     carry role = "admin" in their JWT.  A logged-in non-admin is
 *     redirected to /dashboard rather than /login.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '')

// Routes that require the user to be signed in
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/write', '/profile', '/settings']

// Routes that a signed-in user should be bounced away from
const AUTH_ONLY_PREFIXES = ['/auth/signin', '/auth/signup', '/login', '/register']

// The /admin subtree additionally requires role === 'admin'
const ADMIN_PREFIX = '/admin'

// API routes that are rate-limited (requests per window per IP)
const RATE_LIMITED_ROUTES: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: '/api/ai/chat',   limit: 20,  windowMs: 60_000 },   // 20 req / min
  { prefix: '/api/pipeline',  limit: 5,   windowMs: 60_000 },   // 5  req / min
  { prefix: '/api/ptp',       limit: 10,  windowMs: 60_000 },   // 10 req / min
  { prefix: '/api/articles',  limit: 60,  windowMs: 60_000 },   // 60 req / min (general API)
]

// Known AI-crawler user-agent substrings to block (supplements robots.txt)
const BLOCKED_BOTS = [
  'gptbot',
  'chatgpt-user',
  'ccbot',
  'anthropic-ai',
  'claude-web',
  'omgilibot',
  'diffbot',
  'applebot',         // blocks Apple's training crawler (not search bot)
  'amazonbot',
  'bytespider',
  'petalbot',
]

// ── Edge rate limiter (in-memory, per isolate) ────────────────────────────────

interface RateRecord {
  count:   number
  resetAt: number
}

// Map key: "<route-prefix>:<client-ip>"
const rateStore = new Map<string, RateRecord>()

/**
 * Returns true if the request should be blocked (limit exceeded).
 * Mutates rateStore as a side-effect.
 */
function isRateLimited(ip: string, prefix: string, limit: number, windowMs: number): boolean {
  const key = `${prefix}:${ip}`
  const now  = Date.now()
  const rec  = rateStore.get(key)

  if (!rec || now > rec.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  rec.count += 1
  if (rec.count > limit) return true

  return false
}

// Periodically prune stale entries so the Map doesn't grow unbounded.
// This fires at most once per 5 minutes per isolate invocation.
let lastPruneAt = 0
function maybePruneRateStore() {
  const now = Date.now()
  if (now - lastPruneAt < 5 * 60_000) return
  lastPruneAt = now
  for (const [key, rec] of rateStore) {
    if (now > rec.resetAt) rateStore.delete(key)
  }
}

// ── Security headers ──────────────────────────────────────────────────────────

/**
 * Adds a baseline set of security headers to every response.
 * These are defence-in-depth additions; Vercel also sets some of
 * these at the CDN layer but having them here ensures they appear
 * even for non-cached/edge responses.
 */
function applySecurityHeaders(res: NextResponse, isApiRoute: boolean): NextResponse {
  const h = res.headers

  // Prevent the page from being framed (clickjacking)
  h.set('X-Frame-Options', 'DENY')

  // Block MIME-type sniffing
  h.set('X-Content-Type-Options', 'nosniff')

  // Only send the origin as the referrer when navigating to same-origin
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Force HTTPS for 1 year (only meaningful over HTTPS; browsers ignore on HTTP)
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Disable legacy browser features we don't use
  h.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  )

  // Content-Security-Policy
  // — API routes get a strict deny-all (they return JSON/XML, never HTML)
  // — Page routes get a policy that matches the actual resources loaded
  if (isApiRoute) {
    h.set('Content-Security-Policy', "default-src 'none'")
  } else {
    const csp = [
      "default-src 'self'",

      // Scripts: self + Next.js inline chunks + Vercel Analytics + CDNs used
      // by the AI chat page (react-markdown, katex)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.com https://va.vercel-scripts.com",

      // Styles: self + inline (Tailwind/CSS-in-JS) + KaTeX CDN
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",

      // Images: self + data URIs + the image domains used in NewsCard / OG
      "img-src 'self' data: blob: https: http:",

      // Fonts: self + local font files served from /public
      "font-src 'self' data:",

      // Connections: self + API calls the client side makes
      [
        "connect-src 'self'",
        'https://api.anthropic.com',
        'https://generativelanguage.googleapis.com',
        'https://openrouter.ai',
        'https://api.inngest.com',
        'https://vitals.vercel-insights.com',
        'https://va.vercel-scripts.com',
        // Neon serverless WebSocket
        'wss://*.neon.tech',
      ].join(' '),

      // Frames: deny all (no iframes on the site)
      "frame-src 'none'",
      "frame-ancestors 'none'",

      // Objects: deny Flash / plugins
      "object-src 'none'",

      // Base URI: only allow self to prevent base-tag hijacking
      "base-uri 'self'",

      // Form submissions
      "form-action 'self'",
    ].join('; ')

    h.set('Content-Security-Policy', csp)
  }

  return res
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the real client IP, respecting Vercel / Cloudflare forwarding headers */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    '127.0.0.1'
  )
}

function redirect(url: string, req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(url, req.url))
}

function jsonError(message: string, status: number): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const session      = req.auth           // populated by NextAuth's auth() wrapper
  const isLoggedIn   = !!session?.user
  const userRole     = (session?.user as any)?.role as string | undefined
  const ip           = getClientIp(req)
  const isApiRoute   = pathname.startsWith('/api/')
  const ua           = req.headers.get('user-agent')?.toLowerCase() ?? ''

  // ── 1. Bot / AI-crawler block ─────────────────────────────────────────────
  if (BLOCKED_BOTS.some(bot => ua.includes(bot))) {
    if (isApiRoute) return jsonError('Forbidden', 403)
    return new NextResponse('Forbidden', { status: 403 })
  }

  // ── 2. Edge rate limiting ─────────────────────────────────────────────────
  maybePruneRateStore()

  for (const rule of RATE_LIMITED_ROUTES) {
    if (pathname.startsWith(rule.prefix)) {
      if (isRateLimited(ip, rule.prefix, rule.limit, rule.windowMs)) {
        const res = jsonError('Too many requests — please slow down', 429)
        res.headers.set('Retry-After', String(Math.ceil(rule.windowMs / 1000)))
        return res
      }
      break // a path only matches the first applicable rule
    }
  }

  // ── 3. Auth-page redirect (logged-in users) ───────────────────────────────
  if (isLoggedIn && AUTH_ONLY_PREFIXES.some(p => pathname.startsWith(p))) {
    return redirect('/dashboard', req)
  }

  // ── 4. Protected-route redirect (anonymous users) ─────────────────────────
  if (!isLoggedIn && PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
    return redirect(`/auth/signin?callbackUrl=${callbackUrl}`, req)
  }

  // ── 5. Admin role guard ───────────────────────────────────────────────────
  if (isLoggedIn && pathname.startsWith(ADMIN_PREFIX) && userRole !== 'admin') {
    // Logged-in but not an admin — send to dashboard, not the login page
    return redirect('/dashboard', req)
  }

  // ── 6. Pass through with security headers ─────────────────────────────────
  const res = NextResponse.next()
  return applySecurityHeaders(res, isApiRoute)
})

// ── Matcher ───────────────────────────────────────────────────────────────────

/**
 * Run the middleware on every request except:
 *   - Next.js internals (_next/static, _next/image)
 *   - Static files with extensions (favicon.ico, fonts, images, etc.)
 *
 * The negative lookahead keeps middleware off the static-asset layer
 * so it doesn't add latency to image/font downloads.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|mp4|pdf)).*)',
  ],
}/**
 * middleware.ts  (project root)
 *
 * Runs on every matched request at the edge before any page or API
 * route handler executes.  Responsibilities:
 *
 *  1. Authentication guard  — redirect unauthenticated users away from
 *     protected routes; redirect logged-in users away from auth pages.
 *
 *  2. Security headers  — applied to every response regardless of auth
 *     state (CSP, HSTS, X-Frame-Options, etc.).
 *
 *  3. Edge rate limiting  — simple sliding-window counter stored in a
 *     Map (per-isolate memory).  Protects the AI chat and pipeline
 *     endpoints from abuse without an external store.
 *     Note: because each edge isolate has its own memory, this is
 *     "per-instance" rate limiting, not globally coordinated.  For
 *     production you should back this with Vercel KV or Upstash Redis.
 *
 *  4. Bot / AI-crawler block  — honoured here in addition to robots.txt
 *     because robots.txt is advisory and bad actors ignore it.
 *
 *  5. Admin role guard  — the /admin/* subtree requires the user to
 *     carry role = "admin" in their JWT.  A logged-in non-admin is
 *     redirected to /dashboard rather than /login.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://v0-parallaxa.vercel.app'
).replace(/\/$/, '')

// Routes that require the user to be signed in
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/write', '/profile', '/settings']

// Routes that a signed-in user should be bounced away from
const AUTH_ONLY_PREFIXES = ['/auth/signin', '/auth/signup', '/login', '/register']

// The /admin subtree additionally requires role === 'admin'
const ADMIN_PREFIX = '/admin'

// API routes that are rate-limited (requests per window per IP)
const RATE_LIMITED_ROUTES: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: '/api/ai/chat',   limit: 20,  windowMs: 60_000 },   // 20 req / min
  { prefix: '/api/pipeline',  limit: 5,   windowMs: 60_000 },   // 5  req / min
  { prefix: '/api/ptp',       limit: 10,  windowMs: 60_000 },   // 10 req / min
  { prefix: '/api/articles',  limit: 60,  windowMs: 60_000 },   // 60 req / min (general API)
]

// Known AI-crawler user-agent substrings to block (supplements robots.txt)
const BLOCKED_BOTS = [
  'gptbot',
  'chatgpt-user',
  'ccbot',
  'anthropic-ai',
  'claude-web',
  'omgilibot',
  'diffbot',
  'applebot',         // blocks Apple's training crawler (not search bot)
  'amazonbot',
  'bytespider',
  'petalbot',
]

// ── Edge rate limiter (in-memory, per isolate) ────────────────────────────────

interface RateRecord {
  count:   number
  resetAt: number
}

// Map key: "<route-prefix>:<client-ip>"
const rateStore = new Map<string, RateRecord>()

/**
 * Returns true if the request should be blocked (limit exceeded).
 * Mutates rateStore as a side-effect.
 */
function isRateLimited(ip: string, prefix: string, limit: number, windowMs: number): boolean {
  const key = `${prefix}:${ip}`
  const now  = Date.now()
  const rec  = rateStore.get(key)

  if (!rec || now > rec.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  rec.count += 1
  if (rec.count > limit) return true

  return false
}

// Periodically prune stale entries so the Map doesn't grow unbounded.
// This fires at most once per 5 minutes per isolate invocation.
let lastPruneAt = 0
function maybePruneRateStore() {
  const now = Date.now()
  if (now - lastPruneAt < 5 * 60_000) return
  lastPruneAt = now
  for (const [key, rec] of rateStore) {
    if (now > rec.resetAt) rateStore.delete(key)
  }
}

// ── Security headers ──────────────────────────────────────────────────────────

/**
 * Adds a baseline set of security headers to every response.
 * These are defence-in-depth additions; Vercel also sets some of
 * these at the CDN layer but having them here ensures they appear
 * even for non-cached/edge responses.
 */
function applySecurityHeaders(res: NextResponse, isApiRoute: boolean): NextResponse {
  const h = res.headers

  // Prevent the page from being framed (clickjacking)
  h.set('X-Frame-Options', 'DENY')

  // Block MIME-type sniffing
  h.set('X-Content-Type-Options', 'nosniff')

  // Only send the origin as the referrer when navigating to same-origin
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Force HTTPS for 1 year (only meaningful over HTTPS; browsers ignore on HTTP)
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

  // Disable legacy browser features we don't use
  h.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  )

  // Content-Security-Policy
  // — API routes get a strict deny-all (they return JSON/XML, never HTML)
  // — Page routes get a policy that matches the actual resources loaded
  if (isApiRoute) {
    h.set('Content-Security-Policy', "default-src 'none'")
  } else {
    const csp = [
      "default-src 'self'",

      // Scripts: self + Next.js inline chunks + Vercel Analytics + CDNs used
      // by the AI chat page (react-markdown, katex)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.com https://va.vercel-scripts.com",

      // Styles: self + inline (Tailwind/CSS-in-JS) + KaTeX CDN
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",

      // Images: self + data URIs + the image domains used in NewsCard / OG
      "img-src 'self' data: blob: https: http:",

      // Fonts: self + local font files served from /public
      "font-src 'self' data:",

      // Connections: self + API calls the client side makes
      [
        "connect-src 'self'",
        'https://api.anthropic.com',
        'https://generativelanguage.googleapis.com',
        'https://openrouter.ai',
        'https://api.inngest.com',
        'https://vitals.vercel-insights.com',
        'https://va.vercel-scripts.com',
        // Neon serverless WebSocket
        'wss://*.neon.tech',
      ].join(' '),

      // Frames: deny all (no iframes on the site)
      "frame-src 'none'",
      "frame-ancestors 'none'",

      // Objects: deny Flash / plugins
      "object-src 'none'",

      // Base URI: only allow self to prevent base-tag hijacking
      "base-uri 'self'",

      // Form submissions
      "form-action 'self'",
    ].join('; ')

    h.set('Content-Security-Policy', csp)
  }

  return res
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the real client IP, respecting Vercel / Cloudflare forwarding headers */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    '127.0.0.1'
  )
}

function redirect(url: string, req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(url, req.url))
}

function jsonError(message: string, status: number): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Middleware ────────────────────────────────────────────────────────────────

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const session      = req.auth           // populated by NextAuth's auth() wrapper
  const isLoggedIn   = !!session?.user
  const userRole     = (session?.user as any)?.role as string | undefined
  const ip           = getClientIp(req)
  const isApiRoute   = pathname.startsWith('/api/')
  const ua           = req.headers.get('user-agent')?.toLowerCase() ?? ''

  // ── 1. Bot / AI-crawler block ─────────────────────────────────────────────
  if (BLOCKED_BOTS.some(bot => ua.includes(bot))) {
    if (isApiRoute) return jsonError('Forbidden', 403)
    return new NextResponse('Forbidden', { status: 403 })
  }

  // ── 2. Edge rate limiting ─────────────────────────────────────────────────
  maybePruneRateStore()

  for (const rule of RATE_LIMITED_ROUTES) {
    if (pathname.startsWith(rule.prefix)) {
      if (isRateLimited(ip, rule.prefix, rule.limit, rule.windowMs)) {
        const res = jsonError('Too many requests — please slow down', 429)
        res.headers.set('Retry-After', String(Math.ceil(rule.windowMs / 1000)))
        return res
      }
      break // a path only matches the first applicable rule
    }
  }

  // ── 3. Auth-page redirect (logged-in users) ───────────────────────────────
  if (isLoggedIn && AUTH_ONLY_PREFIXES.some(p => pathname.startsWith(p))) {
    return redirect('/dashboard', req)
  }

  // ── 4. Protected-route redirect (anonymous users) ─────────────────────────
  if (!isLoggedIn && PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
    return redirect(`/auth/signin?callbackUrl=${callbackUrl}`, req)
  }

  // ── 5. Admin role guard ───────────────────────────────────────────────────
  if (isLoggedIn && pathname.startsWith(ADMIN_PREFIX) && userRole !== 'admin') {
    // Logged-in but not an admin — send to dashboard, not the login page
    return redirect('/dashboard', req)
  }

  // ── 6. Pass through with security headers ─────────────────────────────────
  const res = NextResponse.next()
  return applySecurityHeaders(res, isApiRoute)
})

// ── Matcher ───────────────────────────────────────────────────────────────────

/**
 * Run the middleware on every request except:
 *   - Next.js internals (_next/static, _next/image)
 *   - Static files with extensions (favicon.ico, fonts, images, etc.)
 *
 * The negative lookahead keeps middleware off the static-asset layer
 * so it doesn't add latency to image/font downloads.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|mp4|pdf)).*)',
  ],
}