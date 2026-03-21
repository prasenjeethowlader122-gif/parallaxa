import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

/** Detect if a string contains Bengali Unicode characters */
function hasBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text)
}

/** Truncate text to a max number of words */
function truncateWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= max) return text
  return words.slice(0, max).join(' ') + '…'
}

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const slug = searchParams.get('slug')
    const headline = searchParams.get('headline') ?? ''

    if (!slug) {
      return new Response('Missing slug parameter', { status: 400 })
    }

    const article = await getArticleBySlug(slug)
    if (!article) {
      return new Response('Article not found', { status: 404 })
    }

    // ── Load assets in parallel ─────────────────────────────────────────────
    // FIX 1: All fonts must be .ttf — ImageResponse does NOT support .woff2
    // FIX 2: Logo filename URL-encoded (spaces + brackets)
    const [logoData, tiroBanglaData, playfairData, notoSansBengaliData] =
      await Promise.all([
        fetch(
          new URL('/New%20Project%2025%20%5B4D921DE%5D.png', origin)
        ).then((r) => {
          if (!r.ok) throw new Error(`Logo fetch failed: ${r.status}`)
          return r.arrayBuffer()
        }),

        // Tiro Bangla Bold — Bengali serif headline (.ttf)
        fetch(
          'https://fonts.gstatic.com/s/tirobangla/v7/CFnDOJlBFWMCOHABvfxFcQh6QA5pnCxPsA.ttf'
        ).then((r) => {
          if (!r.ok) throw new Error(`Tiro Bangla fetch failed: ${r.status}`)
          return r.arrayBuffer()
        }),

        // Philosopher Bold — English serif headline (.ttf)
        fetch(
          'https://fonts.gstatic.com/s/philosopher/v20/vEFV2_5QCwIS4_Dhez5jcVBpRUwU08qe.ttf'
        ).then((r) => {
          if (!r.ok) throw new Error(`Philosopher fetch failed: ${r.status}`)
          return r.arrayBuffer()
        }),

        // Noto Sans Bengali Regular — clean Bengali UI text (.ttf)
        fetch(
          'https://fonts.gstatic.com/s/notosansbengali/v20/Cn-SJsCGWQxOjaGwMQ6fOicyxLAFBgOHFWoEA8o8TW4.ttf'
        ).then((r) => {
          if (!r.ok)
            throw new Error(`Noto Sans Bengali fetch failed: ${r.status}`)
          return r.arrayBuffer()
        }),
      ])

    const logoSrc = `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`

    const displayHeadline = truncateWords(headline || article.title, 18)
    const isBangla = hasBengali(displayHeadline)
    const headlineFont = isBangla ? '"Tiro Bangla"' : '"Philosopher"'
    const headlineFontSize = isBangla ? 58 : 62

    const formattedDate = new Date(article.date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const categoryLabel = article.category.toUpperCase()

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '1080px',
            height: '1080px',
            position: 'relative',
            backgroundColor: '#0a0a0a',
            fontFamily: '"Philosopher"',
            overflow: 'hidden',
          }}
        >
          {/* ── Background image ── */}
          <img
            src={article.image}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              opacity: 0.55,
            }}
          />

          {/* ── Cinematic vignette: top ── */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '320px',
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.40) 60%, rgba(0,0,0,0) 100%)',
              display: 'flex',
            }}
          />

          {/* ── Cinematic vignette: bottom ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '560px',
              background:
                'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.40) 70%, rgba(0,0,0,0) 100%)',
              display: 'flex',
            }}
          />

          {/* ── Side vignettes for depth ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)',
              display: 'flex',
            }}
          />

          {/* ── TOP BAR ── */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '28px 44px',
            }}
          >
            {/* Logo */}
            <img
              src={logoSrc}
              width={96}
              style={{
                filter: 'brightness(0) invert(1)',
                opacity: 0.95,
              }}
              alt="logo"
            />

            {/* Top right: category pill + date */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '10px',
              }}
            >
              {/* Category badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#E63946',
                  color: '#ffffff',
                  padding: '7px 18px',
                  borderRadius: '4px',
                  fontSize: '19px',
                  fontWeight: 'bold',
                  letterSpacing: '0.08em',
                  fontFamily: '"Philosopher"',
                }}
              >
                {categoryLabel}
              </div>

              {/* Date */}
              <div
                style={{
                  display: 'flex',
                  fontSize: '21px',
                  fontWeight: '400',
                  color: 'rgba(255, 255, 255, 0.70)',
                  letterSpacing: '0.02em',
                  fontFamily: '"Philosopher"',
                }}
              >
                {formattedDate}
              </div>
            </div>
          </div>

          {/* ── BOTTOM CONTENT ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: '0 52px 52px 52px',
              gap: '0px',
            }}
          >
            {/* Accent line */}
            <div
              style={{
                display: 'flex',
                width: '64px',
                height: '5px',
                backgroundColor: '#E63946',
                borderRadius: '3px',
                marginBottom: '22px',
              }}
            />

            {/* FIX 3: Removed -webkit-box / WebkitLineClamp — not supported by Satori.
                      truncateWords(18) already handles overflow. */}
            <div
              style={{
                fontFamily: headlineFont,
                fontSize: `${headlineFontSize}px`,
                fontWeight: 'bold',
                color: '#ffffff',
                lineHeight: isBangla ? 1.45 : 1.25,
                textShadow: '0 2px 20px rgba(0,0,0,0.70)',
                letterSpacing: isBangla ? '0.01em' : '-0.01em',
              }}
            >
              {displayHeadline}
            </div>

            {/* Bottom rule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: '28px',
                gap: '16px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  flex: 1,
                  height: '1px',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                }}
              />
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
            name: 'Philosopher',
            data: playfairData,
            style: 'normal',
            weight: 700,
          },
          {
            name: 'Noto Sans Bengali',
            data: notoSansBengaliData,
            style: 'normal',
            weight: 400,
          },
        ],
      }
    )
  } catch (err) {
    // FIX 4: Catch and surface errors instead of returning an empty response
    console.error('[OG /ptp] Error:', err)
    return new Response(`OG generation failed: ${String(err)}`, {
      status: 500,
    })
  }
}