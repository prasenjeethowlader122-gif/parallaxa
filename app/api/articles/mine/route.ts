import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getAllArticles } from '@/lib/db/articles'

export async function GET(req: NextRequest) {
  const session = await auth()
  
  // 1. Session Guard
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Extract Query Parameters from URL
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '12')
    const page = parseInt(searchParams.get('page') || '1')
    
    // 3. Calculate Offset
    // If page 1: (1-1) * 12 = 0
    // If page 2: (2-1) * 12 = 12
    const offset = (page - 1) * limit

    // 4. Call your DB function with pagination parameters
    // Note: Ensure your 'getAllArticles' function is updated to accept (limit, offset)
    const articles = await getAllArticles(limit, offset)

    // 5. Return the result
    return NextResponse.json(articles)

  } catch (e) {
    console.error('API Error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch articles' }, 
      { status: 500 }
    )
  }
}