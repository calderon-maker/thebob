import { getFirecrawl } from '../lib/firecrawl.js';
import { firecrawlCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

/**
 * Domínios de reconhecimento setorial (eventos, podcasts, prêmios, entidades).
 */
export const RECOGNITION_DOMAINS = [
  'rdsummit.com.br',
  'fireshow.com.br',
  'agenciasdigitais.org',
  'abradi.com.br',
  'abramark.com',
  'spotify.com',
  'open.spotify.com',
  'caboredopapel.com.br',
  'meioemensagem.com.br/award',
  'awards.abradi.com.br',
  'forbes.com.br/listas',
  'iabbrasil.com.br',
  'aba.com.br',
  'aberje.com.br',
  'abemd.org.br',
  'youtube.com',
] as const;

export interface RecognitionHit {
  url: string;
  title: string;
  domain: string;
  type: 'event' | 'podcast' | 'award' | 'membership' | 'unknown';
}

export interface RecognitionResult {
  hits: RecognitionHit[];
  timing: Timing;
  cost: CostEntry[];
}

export async function searchRecognition(fullName: string): Promise<RecognitionResult> {
  const fc = getFirecrawl();
  const { result, timing } = await timed('firecrawl-recognition', async () => {
    const queries = [
      `"${fullName}" palestra OR palestrante`,
      `"${fullName}" podcast`,
      `"${fullName}" prêmio OR award`,
      `"${fullName}" abradi OR abramark`,
    ];
    let credits = 0;
    const hits: RecognitionHit[] = [];

    for (const q of queries) {
      try {
        const r = (await fc.search(q, { limit: 8 })) as unknown as {
          data?: Array<Record<string, unknown>>;
          results?: Array<Record<string, unknown>>;
        };
        const data = r.data ?? r.results ?? [];
        credits += data.length;
        for (const item of data) {
          const url = (item['url'] as string) ?? '';
          if (!url) continue;
          const domain = RECOGNITION_DOMAINS.find((d) => url.includes(d));
          if (!domain) continue;
          hits.push({
            url,
            title: (item['title'] as string) ?? '',
            domain,
            type: classify(url, q),
          });
        }
      } catch (err) {
        console.warn(`[firecrawl-recognition] falha em ${q}`, err);
      }
    }
    return { hits, credits };
  });

  return {
    hits: result.hits,
    timing,
    cost: [firecrawlCost(result.credits, 'search')],
  };
}

function classify(url: string, query: string): RecognitionHit['type'] {
  if (url.includes('spotify') || query.includes('podcast')) return 'podcast';
  if (query.includes('prêmio') || query.includes('award') || url.includes('award')) return 'award';
  if (query.includes('abradi') || query.includes('abramark')) return 'membership';
  if (query.includes('palestra')) return 'event';
  return 'unknown';
}
