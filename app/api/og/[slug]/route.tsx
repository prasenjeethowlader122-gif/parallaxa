import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams , origin} = new URL(request.url)
  const slug = searchParams.get('slug')
  
  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 })
  }
  const profilePicData = await fetch(
    new URL('/New Project 20 [79DB18E].png', origin)
  ).then((res) => res.arrayBuffer());
  const article = await getArticleBySlug(slug)
  
  if (!article) {
    return new Response('Article not found', { status: 404 })
  }
  
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          backgroundImage: `url(${article.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        
        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '60px',
          }}
        >
          {/* Category badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              {article.category}
            </div>
            {article.breaking && (
              <div
                style={{
                  backgroundColor: '#991b1b',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                BREAKING
              </div>
            )}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: '0 0 24px 0',
              lineHeight: '1.2',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {article.title}
          </h1>

          {/* Meta info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              fontSize: '18px',
              color: '#e5e7eb',
              fontWeight: '500',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👤</span>
              <span>{article.author}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📅</span>
              <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div> <img src = { profilePicData as any } style = {
        {
        filter: 'invert(100%)',
          position: 'absolute',
          top: '20px',
          left: '20px',
        
        }
      }
      width = "100"
      alt = "profile" />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}