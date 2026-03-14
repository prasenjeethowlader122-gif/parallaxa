
import { NextRequest, NextResponse } from 'next/server'
import Firecrawl from '@mendable/firecrawl-js';


export async function GET(
  _: NextRequest, { params }: { params: Promise < { url: string } > }
) {
  try {
    
    const firecrawl = new Firecrawl({ apiKey: "fc-da0837003c26469da0f8c259c6c10944" });
    const { url } = await params
    const results = await firecrawl.search(url, {
      limit: 3,
      scrapeOptions: { formats: ['markdown'] }
    });
    console.log(results);
    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json({})
  }
}