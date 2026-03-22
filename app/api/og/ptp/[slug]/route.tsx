import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

// Edge runtime does not have Buffer — use a pure-JS base64 encoder
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function hasBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text)
}

export async function GET(
  request: Request, { params }: { params: Promise < { slug: string } > }
) {
  // Next.js 15+: params is a Promise and must be awaited
  const { slug } = await params
  const { searchParams, origin } = new URL(request.url)
  const headline = searchParams.get('headline') ?? ''
  
  if (!slug) return new Response('Missing slug', { status: 400 })
  
  const article = await getArticleBySlug(slug)
  if (!article) return new Response('Not found', { status: 404 })
  
  let logoData: ArrayBuffer
  let playfairData: ArrayBuffer
  let tiroBanglaData: ArrayBuffer
  
  try {
    ;
    [logoData, playfairData, tiroBanglaData] = await Promise.all([
      fetch(new URL('/New%20Project%2025%20%5B4D921DE%5D.png', origin)).then(r => {
        if (!r.ok) throw new Error(`Logo fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),
      fetch(new URL('/local/philosopher-font/Philosopher-Bold.ttf', origin)).then(r => {
        if (!r.ok) throw new Error(`Philosopher font fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),
      fetch(new URL('/local/font/Ekush-Regular.ttf', origin)).then(r => {
        if (!r.ok) throw new Error(`Noto Serif Bengali font fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Asset fetch failed'
    return new Response(message, { status: 500 })
  }
  
  // Edge-safe base64 (no Buffer in the edge runtime)
  const logoSrc = `data:image/png;base64,${arrayBufferToBase64(logoData)}`
  
  const displayHeadline = headline || article.title
  const isBangla = hasBengali(displayHeadline)
  const headlineFont = isBangla ? '"Tiro Bangla"' : '"Philosopher"'
  const headlineFontSize = isBangla ? 51 : 56
  const headlineFontWeight = 400
  
  const wordCount = article.content?.split(/\s+/).length ?? 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))
  
  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1080px',
          height: '1080px',
          position: 'relative',
          backgroundColor: '#FAFAF7',
          overflow: 'hidden',
        }}
      >
        {/* ── TOP: Article photo (62% height) ── */}
        {article.image ? (
          <img
            src={article.image}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: '62%',
              objectFit: 'cover',
              objectPosition: 'center top',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '62%',
              background: 'linear-gradient(135deg, #b8cfe8 0%, #8aaccc 40%, #6b90b8 100%)',
              display: 'flex',
            }}
          />
        )}

        {/* ── Subtle dark scrim over photo ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '62%',
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.06) 55%, rgba(0,0,0,0.36) 100%)',
            display: 'flex',
          }}
        />

        {/* ── TOP BAR (on photo) ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '36px 48px',
          }}
        >
          <img
            src={logoSrc}
            width={100}
            style={{ filter: 'brightness(0) invert(1)', opacity: 0.95 }}
            alt="logo"
          />
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              color: 'rgba(255,255,255,0.82)',
              fontFamily: '"Philosopher"',
              letterSpacing: '0.04em',
            }}
          >
            {formattedDate}
          </div>
        </div>

        {/* ── WHITE BOTTOM PANEL (38% height) ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            backgroundColor: '#FAFAF7',
            display: 'flex',
            flexDirection: 'column',
            padding: '28px 48px 36px',
          }}
        >
          {/* Category + read time row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '17px',
                fontWeight: 'bold',
                letterSpacing: '0.14em',
                color: '#C0392B',
                fontFamily: '"Philosopher"',
              }}
            >
              {article.category.toUpperCase()}
            </div>
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e0ddd6',
                display: 'flex',
              }}
            />
            <div
              style={{
                display: 'flex',
                fontSize: '16px',
                color: '#aaaaaa',
                fontFamily: '"Philosopher"',
                letterSpacing: '0.04em',
              }}
            >
              {readTime} min read
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontFamily: headlineFont,
              fontSize: `${headlineFontSize}px`,
              fontWeight: headlineFontWeight,
              color: '#111111',
              lineHeight: isBangla ? 1.6 : 1.16,
              letterSpacing: isBangla ? '0' : '-0.02em',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1,
            }}
          >
            {displayHeadline}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #e8e8e2',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: '16px',
                fontWeight: 'bold',
                letterSpacing: '0.12em',
                color: '#bbbbbb',
                fontFamily: '"Philosopher"',
              }}
            >
              PARALLAXA.COM
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '16px',
                color: '#C0392B',
                fontFamily: '"Philosopher"',
                letterSpacing: '0.06em',
              }}
            >
              @parallaxa
            </div>
          </div>
        </div> </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'Philosopher', data: playfairData, style: 'normal', weight: 700 },
        { name: 'Tiro Bangla', data: tiroBanglaData, style: 'normal', weight: 400 },
      ],
    }
  )
}