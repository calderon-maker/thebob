/**
 * Tabelas de preço (USD) para os crawlers do TheBob.
 * Atualizar quando os preços mudarem ou quando trocarmos de actor.
 *
 * Referencias (capturadas em 2026-04-25):
 * - Apify Pay-Per-Result, média $2-$5 por 1.000 resultados.
 * - Firecrawl Hobby, $19/mês, 100k créditos = $0,00019/crédito.
 * - Anthropic Claude Sonnet 4.6, $3/MTok in, $15/MTok out.
 */

export const APIFY_USD_PER_RESULT = {
  // actor: harvestapi/linkedin-profile-scraper, "Profile details no email"
  linkedin_profile: 0.004,
  // actor: harvestapi/linkedin-profile-posts
  linkedin_posts: 0.002,
  // actor: harvestapi/linkedin-profile-search-by-services, PAY_PER_EVENT estimado ~$0.005
  linkedin_search: 0.005,
  // actor: apify/instagram-profile-scraper
  instagram_profile: 0.0023,
  // actor: clockworks/free-tiktok-scraper
  tiktok_profile: 0.004,
  // actor: streamers/youtube-scraper
  youtube_channel: 0.005,
  // actor: apify/google-trends-scraper, FLAT $20/mês, custo zero por resultado dentro da assinatura
  google_trends: 0,
} as const;

export const FIRECRAWL_USD_PER_CREDIT = 0.00019;

export const CLAUDE_USD = {
  sonnet_4_6_in_per_mtok: 3.0,
  sonnet_4_6_out_per_mtok: 15.0,
} as const;

export interface CostEntry {
  source: 'apify' | 'firecrawl' | 'claude' | 'google_trends';
  actor?: string;
  units: number;
  unit: string;
  usd: number;
  detail?: Record<string, unknown>;
}

export function apifyCost(actor: keyof typeof APIFY_USD_PER_RESULT, results: number): CostEntry {
  return {
    source: actor === 'google_trends' ? 'google_trends' : 'apify',
    actor,
    units: results,
    unit: 'results',
    usd: results * APIFY_USD_PER_RESULT[actor],
  };
}

export function firecrawlCost(credits: number, mode: 'scrape' | 'search' | 'crawl' = 'scrape'): CostEntry {
  return {
    source: 'firecrawl',
    actor: `firecrawl_${mode}`,
    units: credits,
    unit: 'credits',
    usd: credits * FIRECRAWL_USD_PER_CREDIT,
  };
}

export function claudeCost(inTokens: number, outTokens: number): CostEntry {
  const usd =
    (inTokens / 1_000_000) * CLAUDE_USD.sonnet_4_6_in_per_mtok +
    (outTokens / 1_000_000) * CLAUDE_USD.sonnet_4_6_out_per_mtok;
  return {
    source: 'claude',
    actor: 'claude_sonnet_4_6',
    units: inTokens + outTokens,
    unit: 'tokens',
    usd,
    detail: { in: inTokens, out: outTokens },
  };
}

export function sumUsd(entries: CostEntry[]): number {
  return entries.reduce((acc, e) => acc + e.usd, 0);
}
