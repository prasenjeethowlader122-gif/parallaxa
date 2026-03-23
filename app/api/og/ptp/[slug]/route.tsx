import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

// Edge-safe base64 encoder
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
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams, origin } = new URL(request.url)
  const headline = searchParams.get('headline') ?? ''

  if (!slug) return new Response('Missing slug', { status: 400 })

  const article = await getArticleBySlug(slug)
  if (!article) return new Response('Not found', { status: 404 })

  let logoData: ArrayBuffer
  let philosopherData: ArrayBuffer
  let notoSerifBanglaData: ArrayBuffer

  try {
    ;[logoData, philosopherData, notoSerifBanglaData] = await Promise.all([
      fetch(new URL('/New%20Project%2025%20%5B4D921DE%5D.png', origin)).then(r => {
        if (!r.ok) throw new Error(`Logo fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),

      fetch(new URL('/local/philosopher-font/Philosopher-Bold.ttf', origin)).then(r => {
        if (!r.ok) throw new Error(`Philosopher font fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),

      fetch(new URL('/local/font/NotoSerifBengali-Regular.ttf', origin)).then(r => {
        if (!r.ok) throw new Error(`Noto Serif Bengali fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Asset fetch failed'
    return new Response(message, { status: 500 })
  }

  const logoSrc = `data:image/png;base64,${arrayBufferToBase64(logoData)}`

  // Fetch article image and re-encode as base64.
  // @vercel/og does NOT support WebP — fall back to gradient if WebP or fetch fails.
  let articleImageSrc: string | null = null
  if (article.image) {
    try {
      const imgRes = await fetch(article.image)
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
        if (!contentType.includes('webp')) {
          const imgBuffer = await imgRes.arrayBuffer()
          articleImageSrc = `data:${contentType};base64,${arrayBufferToBase64(imgBuffer)}`
        }
      }
    } catch {
      // silently fall back to gradient placeholder
    }
  }

  const displayHeadline = headline || article.title
  const isBangla = hasBengali(displayHeadline)

  const headlineFont = isBangla ? 'NotoSerifBengali' : 'Philosopher'
  const headlineFontSize = isBangla ? 52 : 56

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
        {/* Top Image */}
        {articleImageSrc ? (
          <img
            src={articleImageSrc}
            width={1080}
            height={670}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '62%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              height: '62%',
              background: 'linear-gradient(135deg, #b8cfe8, #6b90b8)',
              display: 'flex',
            }}
          />
        )}

        {/* Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            height: '62%',
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.1), rgba(0,0,0,0.4))',
            display: 'flex',
          }}
        />

        {/* Top Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '36px 48px',
            alignItems: 'center',
          }}
        >
          <img src={logoSrc} width={100} height={100} style={{ filter: 'invert(1)' }} />
          <div
            style={{
              color: 'white',
              fontSize: 20,
              fontFamily: 'Philosopher',
            }}
          >
            {formattedDate}
          </div>
        </div>

        {/* Bottom Panel */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: '40%',
            backgroundColor: '#FAFAF7',
            padding: '32px 48px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Meta */}
          <div style={{ display: 'flex', marginBottom: 16 }}>
            <div
              style={{
                color: '#C0392B',
                fontFamily: 'Philosopher',
                letterSpacing: '0.12em',
                fontSize: 16,
              }}
            >
              {article.category.toUpperCase()}
            </div>

            <div style={{ flex: 1 }} />

            <div
              style={{
                color: '#999',
                fontFamily: 'Philosopher',
                fontSize: 15,
              }}
            >
              {readTime} min read
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontFamily: headlineFont,
              fontSize: headlineFontSize,
              lineHeight: isBangla ? 1.5 : 1.2,
              color: '#111',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayHeadline}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #eee',
              paddingTop: 16,
              fontFamily: 'Philosopher',
            }}
          >
            <div style={{ color: '#bbb' }}>PARALLAXA.COM</div>
            <div style={{ color: '#C0392B' }}>@parallaxa</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        {
          name: 'Philosopher',
          data: philosopherData,
          weight: 700,
          style: 'normal',
        },
        {
          name: 'NotoSerifBengali',
          data: notoSerifBanglaData,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  )
}