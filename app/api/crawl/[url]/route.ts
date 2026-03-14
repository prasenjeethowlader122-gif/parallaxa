import { NextRequest, NextResponse } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js';


export async function GET(
  _: NextRequest, { params }: { params: Promise < { url: string } > }
) {
  try {
    
    const firecrawl = new Firecrawl({ apiKey: "fc-da0837003c26469da0f8c259c6c10944" });
    const { url } = await params
    const res = await firecrawl.map('https://news.google.com', { limit: 50 });
    
    return NextResponse.json(res)
  } catch (e) {
    return NextResponse.json({})
  }
}