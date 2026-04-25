import { type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface TrendsResult {
  found: boolean;
  averageInterest?: number;
  peakInterest?: number;
  series?: Array<{ date: string; value: number }>;
  timing: Timing;
  cost: CostEntry[];
}

/**
 * Google Trends, no Apify só existe em modelo de assinatura mensal flat ($20/mês
 * no apify/google-trends-scraper, $20 no emastra). Para o piloto pulamos o
 * crawler e marcamos como "skipped". Após assinar 1 actor, basta plugar.
 *
 * Alternativas para benchmark unitário:
 *   - Firecrawl scrape em https://trends.google.com/trends/explore?q=<name>&geo=BR
 *   - SerpAPI Google Trends endpoint ($50/mês)
 *   - Implementar via @apify/google-trends-scraper após contratar.
 */
export async function scrapeTrends(_fullName: string): Promise<TrendsResult> {
  const { result, timing } = await timed('google-trends', async () => {
    return { found: false, skipped: true } as const;
  });

  return {
    ...result,
    timing,
    cost: [],
  };
}
