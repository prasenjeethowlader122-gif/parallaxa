import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

// ── Google Font loader ────────────────────────────────────────────────────────
async function loadGoogleFont(
  family: string,
  text: string,
  options?: { noSubset?: boolean }
): Promise<ArrayBuffer> {
  // Some families (e.g. Noto Serif Bengali) don't return TTF with text= subsetting.
  // Pass noSubset: true to fetch the full font CSS instead.
  const base = `https://fonts.googleapis.com/css2?family=${family}`
  const url = options?.noSubset ? base : `${base}&text=${encodeURIComponent(text)}`

  const css = await fetch(url, {
    headers: {
      // Spoof an older UA — forces Google to return TTF/OTF instead of WOFF2
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36',
    },
  }).then(r => {
    if (!r.ok) throw new Error(`Google Fonts CSS fetch failed (${r.status}): ${url}`)
    return r.text()
  })

  // Match opentype or truetype first, then fall back to woff2
  const ttfMatch = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)
  const woff2Match = css.match(/src: url\((.+?)\) format\('woff2'\)/)
  const fontUrl = ttfMatch?.[1] ?? woff2Match?.[1]

  if (!fontUrl) throw new Error(`Failed to parse Google Font CSS for: ${family}`)

  const fontRes = await fetch(fontUrl)
  if (!fontRes.ok) throw new Error(`Failed to fetch font file: ${fontUrl}`)
  return fontRes.arrayBuffer()
}

// ── Edge-safe base64 encoder ──────────────────────────────────────────────────
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ── Bengali detector ──────────────────────────────────────────────────────────
function hasBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text)
}

// ── Route ─────────────────────────────────────────────────────────────────────
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

  const displayHeadline = headline || article.title
  const isBangla = hasBengali(displayHeadline)

  // ── Asset + font loading ──────────────────────────────────────────────────
  let logoData: ArrayBuffer
  let philosopherData: ArrayBuffer
  let notoSerifBanglaData: ArrayBuffer

  try {
    ;[logoData, philosopherData, notoSerifBanglaData] = await Promise.all([
      // Site logo
      fetch(new URL('/New%20Project%2025%20%5B4D921DE%5D.png', origin)).then(r => {
        if (!r.ok) throw new Error(`Logo fetch failed: ${r.status}`)
        return r.arrayBuffer()
      }),

      // Philosopher Bold — subsetted to headline glyphs (works fine)
      loadGoogleFont('Philosopher:wght@700', displayHeadline),

      // Noto Serif Bengali — noSubset: true because Google doesn't return
      // TTF with text= subsetting for this family; fetch the full CSS instead
      loadGoogleFont('Noto+Serif+Bengali', displayHeadline, { noSubset: true }),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Asset fetch failed'
    return new Response(message, { status: 500 })
  }

  const logoSrc = `data:image/png;base64,${arrayBufferToBase64(logoData)}`

  // ── Article image ─────────────────────────────────────────────────────────
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

  // ── Typography ────────────────────────────────────────────────────────────
  const headlineFont = isBangla ? 'NotoSerifBengali' : 'Philosopher'
  const headlineFontSize = isBangla ? 52 : 56

  // ── Meta ──────────────────────────────────────────────────────────────────
  const wordCount = article.content?.split(/\s+/).length ?? 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const formattedDate = new Date(article.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // ── Render ────────────────────────────────────────────────────────────────
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
          {/* Meta row */}
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
              display: 'flex',
              fontFamily: headlineFont,
              fontSize: headlineFontSize,
              lineHeight: isBangla ? 1.5 : 1.2,
              color: '#111',
              overflow: 'hidden',
              maxHeight: isBangla
                ? `${headlineFontSize * 1.5 * 3}px`
                : `${headlineFontSize * 1.2 * 3}px`,
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