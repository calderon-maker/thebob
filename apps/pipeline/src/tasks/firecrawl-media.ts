import { getFirecrawl } from '../lib/firecrawl.js';
import { firecrawlCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

/**
 * 20 veículos especializados em marketing/negócios BR
 * (lista canônica do TheBob, ver memoria_projeto §critério 3).
 */
export const MEDIA_OUTLETS = [
  'meioemensagem.com.br',
  'propmark.com.br',
  'exame.com',
  'valor.globo.com',
  'adnews.com.br',
  'mundodomarketing.com.br',
  'brainstorm9.com.br',
  'b9.com.br',
  'ecommercebrasil.com.br',
  'marketingbynerds.com',
  'consumidormoderno.com.br',
  'pegn.globo.com',
  'startse.com',
  'neofeed.com.br',
  'thebrief.com.br',
  'baguete.com.br',
  'mktesportivo.com',
  'forbes.com.br',
  'epocanegocios.globo.com',
  'tecmundo.com.br',
] as const;

export interface MediaMention {
  url: string;
  title: string;
  outlet: string;
  publishedAt?: string;
  snippet?: string;
}

export interface FirecrawlMediaResult {
  mentions: MediaMention[];
  outletsHit: string[];
  timing: Timing;
  cost: CostEntry[];
}

export async function searchMediaMentions(fullName: string): Promise<FirecrawlMediaResult> {
  const fc = getFirecrawl();
  const { result, timing } = await timed('firecrawl-media', async () => {
    const queries = MEDIA_OUTLETS.map((outlet) => `"${fullName}" site:${outlet}`);
    let totalCredits = 0;
    const mentions: MediaMention[] = [];
    const outletsHit = new Set<string>();

    for (const query of queries) {
      try {
        const response = (await fc.search(query, { limit: 5 })) as unknown as {
          data?: Array<Record<string, unknown>>;
          results?: Array<Record<string, unknown>>;
        };
        const data = response.data ?? response.results ?? [];
        totalCredits += data.length;
        for (const r of data) {
          const url = (r['url'] as string) ?? '';
          if (!url) continue;
          const outlet = MEDIA_OUTLETS.find((o) => url.includes(o));
          if (!outlet) continue;
          outletsHit.add(outlet);
          mentions.push({
            url,
            title: (r['title'] as string) ?? '',
            outlet,
            snippet: (r['description'] as string) ?? (r['snippet'] as string) ?? '',
            publishedAt: (r['publishedAt'] as string) ?? (r['date'] as string) ?? undefined,
          });
        }
      } catch (err) {
        console.warn(`[firecrawl-media] falha em ${query}`, err);
      }
    }
    return { mentions, outletsHit: [...outletsHit], totalCredits };
  });

  return {
    mentions: result.mentions,
    outletsHit: result.outletsHit,
    timing,
    cost: [firecrawlCost(result.totalCredits, 'search')],
  };
}
