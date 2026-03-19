const FIRESCRAPE_BASE = 'https://parallaxa-py-1.onrender.com'

async function firescrapeMap(url: string, maxPages = 50): Promise<string[]> {
  const res = await fetch(`${FIRESCRAPE_BASE}/v1/map`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      include_sitemap: false,
      max_pages: maxPages,
      same_domain: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`FireScrape map failed for ${url}: ${res.status} ${text}`)
  }

  // API shape: { total: number, urls: string[], url_details: {...}, stats: {...} }
  const data = await res.json() as { total?: number; urls?: string[] }
  return data.urls ?? []
}
export const newsPipelineFunction = inngest.createFunction(
  {
    id: 'news-pipeline',
    name: 'Yahoo News Pipeline',
    retries: 2,
    concurrency: { limit: 1 },
  },
  { event: 'news/pipeline.requested' },

  async ({ step }) => {
    // Step 1: Crawl
    const links = await step.run('crawl-yahoo-news', async () => {
      const found = await crawlYahooNewsLinks('https://yahoo.com/news/',10)
      return found;
      //const f = await
    })
    return links
  }
)