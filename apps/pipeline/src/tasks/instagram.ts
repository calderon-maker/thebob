import { runActor } from '../lib/apify.js';
import { apifyCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface InstagramResult {
  found: boolean;
  username?: string;
  followers?: number;
  posts?: number;
  avgLikes?: number;
  timing: Timing;
  cost: CostEntry[];
}

export async function scrapeInstagram(handle: string | null): Promise<InstagramResult> {
  const { result, timing } = await timed('instagram', async () => {
    if (!handle) return { found: false } as const;
    const { items } = await runActor<{
      username?: string;
      followersCount?: number;
      postsCount?: number;
      latestPosts?: Array<{ likesCount?: number }>;
    }>({
      actorId: 'apify/instagram-profile-scraper',
      input: { usernames: [handle] },
      timeoutSecs: 120,
    });
    const it = items[0];
    if (!it) return { found: false } as const;
    const likes = (it.latestPosts ?? []).map((p) => p.likesCount ?? 0);
    const avgLikes = likes.length ? likes.reduce((a, b) => a + b, 0) / likes.length : 0;
    return {
      found: true,
      username: it.username,
      followers: it.followersCount,
      posts: it.postsCount,
      avgLikes,
    };
  });

  return {
    ...result,
    timing,
    cost: result.found ? [apifyCost('instagram_profile', 1)] : [],
  };
}
