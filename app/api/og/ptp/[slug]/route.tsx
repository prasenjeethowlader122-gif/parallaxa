import { ImageResponse } from 'next/og'
import { getArticleBySlug } from '@/lib/news-data'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const slug = searchParams.get('slug')
  
  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 })
  }
  
  const profilePicData = await fetch(
    new URL('/New Project 25 [4D921DE].png', origin)
  ).then((res) => res.arrayBuffer())
  
  const profilePicSrc = `data:image/png;base64,${Buffer.from(profilePicData).toString('base64')}`
  
  const article = await getArticleBySlug(slug)
  
  if (!article) {
    return new Response('Article not found', { status: 404 })
  }
  
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

        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.30)',
            display: 'flex',
          }}
        />

        {/* Watermark — top left */}
        <img
          src={profilePicSrc}
          width={150}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            filter: 'invert(100%)',
          }}
          alt="logo"
        />

        {/* Date — top right */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 28,
            display: 'flex',
            fontSize: '22px',
            color: 'rgba(255, 255, 255, 0.75)',
          }}
        >
          {new Date(article.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  )
}