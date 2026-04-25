import FirecrawlApp from '@mendable/firecrawl-js';

let cached: FirecrawlApp | null = null;

export function getFirecrawl(): FirecrawlApp {
  if (cached) return cached;
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY ausente, configure em .env.local');
  }
  cached = new FirecrawlApp({ apiKey });
  return cached;
}
