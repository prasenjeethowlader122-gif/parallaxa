import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// --- Rate Limiter (in-memory, per IP) ---
// Note: For multi-instance/serverless deployments, replace this with
// a Redis-backed store (e.g. Upstash) for shared state across instances.
const rateLimitMap = new Map < string,
  { count: number;windowStart: number } > ();

const RATE_LIMIT = 10; // max requests
const WINDOW_MS = 10 * 1000; // per 10 seconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // Start a fresh window
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return true;
  }
  
  entry.count++;
  return false;
}

// --- Middleware ---
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Only apply to /api/* routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  
  // In middleware.ts, inside the route checks:
  if (pathname.startsWith('/article/') && !pathname.endsWith('.pn')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname + '.pn';
    return NextResponse.redirect(url, 301);
  }
  // Allow next-auth's own endpoints to pass through freely
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  
  // 1. Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": "10",
        "X-RateLimit-Limit": String(RATE_LIMIT),
        "X-RateLimit-Window": "10s",
      },
    });
  }
  
  // 2. Auth protection
  const token = await getToken({
    req,
    secret: 'jUeVqevjX3mTrNSHdomPVUos4O/rZOyJLWByViRoT5WcwyfcULBLe/BC46o=',
  });
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};