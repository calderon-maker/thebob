import { runActor } from '../lib/apify.js';
import { apifyCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface YoutubeResult {
  found: boolean;
  channelName?: string;
  subscribers?: number;
  videos?: number;
  totalViews?: number;
  timing: Timing;
  cost: CostEntry[];
}

export async function scrapeYoutube(channelUrl: string | null): Promise<YoutubeResult> {
  const { result, timing } = await timed('youtube', async () => {
    if (!channelUrl) return { found: false } as const;
    const { items } = await runActor<{
      channelName?: string;
      numberOfSubscribers?: number;
      totalVideos?: number;
      totalViews?: number;
    }>({
      actorId: 'streamers/youtube-scraper',
      input: {
        startUrls: [{ url: channelUrl }],
        maxResults: 1,
      },
      timeoutSecs: 180,
    });
    const it = items[0];
    if (!it) return { found: false } as const;
    return {
      found: true,
      channelName: it.channelName,
      subscribers: it.numberOfSubscribers,
      videos: it.totalVideos,
      totalViews: it.totalViews,
    };
  });
  return { ...result, timing, cost: result.found ? [apifyCost('youtube_channel', 1)] : [] };
}
