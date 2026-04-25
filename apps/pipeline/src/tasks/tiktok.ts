import { runActor } from '../lib/apify.js';
import { apifyCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface TiktokResult {
  found: boolean;
  username?: string;
  followers?: number;
  videos?: number;
  avgViews?: number;
  timing: Timing;
  cost: CostEntry[];
}

export async function scrapeTiktok(handle: string | null): Promise<TiktokResult> {
  const { result, timing } = await timed('tiktok', async () => {
    if (!handle) return { found: false } as const;
    const { items } = await runActor<{
      authorMeta?: { name?: string; fans?: number; video?: number };
      playCount?: number;
    }>({
      actorId: 'clockworks/free-tiktok-scraper',
      input: {
        profiles: [handle],
        resultsPerPage: 10,
        shouldDownloadVideos: false,
      },
      timeoutSecs: 180,
    });
    const author = items[0]?.authorMeta;
    if (!author) return { found: false } as const;
    const views = items.map((v) => v.playCount ?? 0);
    const avgViews = views.length ? views.reduce((a, b) => a + b, 0) / views.length : 0;
    return {
      found: true,
      username: author.name,
      followers: author.fans,
      videos: author.video,
      avgViews,
    };
  });
  return { ...result, timing, cost: result.found ? [apifyCost('tiktok_profile', 1)] : [] };
}
