import { CheerioCrawler, EnqueueStrategy } from 'crawlee';
import { NextRequest, NextResponse } from 'next/server'


export async function GET(
  _: NextRequest, { params }: { params: Promise < { id: string } > }
) {
  try {
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 10, // Limitation for only 10 requests (do not use if you want to crawl all links)
      async requestHandler({ request, enqueueLinks, log }) {
        log.info(request.url);
        await enqueueLinks({
          // Setting the strategy to 'all' will enqueue all links found
          strategy: EnqueueStrategy.All,
          // Alternatively, you can pass in the string 'all'
          // strategy: 'all',
        });
      },
    });
    
    // Run the crawler with initial request
    const r =  await crawler.run(['https://crawlee.dev']);
    return NextResponse.json(r)
  } catch (e) {
    return NextResponse.json({})
  }
}