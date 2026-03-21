import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

/** Naively detect if a string contains Bengali Unicode characters */
function hasBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const slug = searchParams.get('slug')
  const headline = searchParams.get('headline') ?? ''

  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 })
  }

  // ── Load assets in parallel ───────────────────────────────────────────────
  const [profilePicData, tiroBanglaData, playfairData] = await Promise.all([
    fetch(new URL('/New Project 25 [4D921DE].png', origin)).then((r) =>
      r.arrayBuffer()
    ),
    // Tiro Bangla Bold — Bengali serif
    fetch(
      'https://fonts.gstatic.com/s/tirobangla/v7/CFnDOJlBFWMCOHABvfxFcQh6QA5gmA.woff2'
    ).then((r) => r.arrayBuffer()),
    // Playfair Display Bold — English serif
    fetch(
      'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgEM86xRbPQ.woff2'
    ).then((r) => r.arrayBuffer()),
  ])

  const profilePicSrc = `data:image/png;base64,${Buffer.from(profilePicData).toString('base64')}`

  const article = await getArticleBySlug(slug)

  if (!article) {
    return new Response('Article not found', { status: 404 })
  }

  const displayHeadline = headline || article.title
  const isBangla = hasBengali(displayHeadline)
  const headlineFont = isBangla ? '"Tiro Bangla"' : '"Playfair Display"'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Background image */}
        <img
          src={article.image}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Top dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '260px',
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 100%)',
            display: 'flex',
          }}
        />

        {/* Bottom dark overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '420px',
            background:
              'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.60) 55%, rgba(0,0,0,0) 100%)',
            display: 'flex',
          }}
        />

        {/* Logo — top left */}
        <img
          src={profilePicSrc}
          width={110}
          style={{
            position: 'absolute',
            top: 22,
            left: 22,
            filter: 'invert(100%)',
          }}
          alt="logo"
        />

        {/* Date — top right */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            right: 32,
            display: 'flex',
            fontSize: '24px',
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.80)',
          }}
        >
          {new Date(article.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>

        {/* Bottom content — category badge + headline */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 52px 56px 52px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Category badge */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 20px',
                borderRadius: '6px',
                fontSize: '22px',
                fontWeight: 'bold',
                letterSpacing: '0.04em',
              }}
            >
              {article.category.toUpperCase()}
            </div>
          </div>

          {/* Headline — Tiro Bangla (Bengali) or Playfair Display (English) */}
          <div
            style={{
              fontFamily: headlineFont,
              fontSize: '54px',
              fontWeight: 'bold',
              color: '#ffffff',
              lineHeight: '1.30',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textShadow: '0 2px 14px rgba(0,0,0,0.55)',
            }}
          >
            {displayHeadline}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        {
          name: 'Tiro Bangla',
          data: tiroBanglaData,
          style: 'normal',
          weight: 700,
        },
        {
          name: 'Playfair Display',
          data: playfairData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}