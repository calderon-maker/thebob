import { runActor } from '../lib/apify.js';
import { apifyCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface LinkedinProfile {
  fullName?: string;
  headline?: string;
  followersCount?: number;
  connectionsCount?: number;
  about?: string;
  experience?: unknown[];
  rawJson: unknown;
}

export interface LinkedinPost {
  postedAt?: string;
  text?: string;
  reactions?: number;
  comments?: number;
  shares?: number;
  url?: string;
}

export interface LinkedinResult {
  profile: LinkedinProfile;
  posts: LinkedinPost[];
  metrics: {
    followers: number;
    avgEngagement: number;
    postsPerMonth: number;
  };
  timing: Timing;
  cost: CostEntry[];
}

export async function scrapeLinkedin(linkedinUrl: string): Promise<LinkedinResult> {
  const { result, timing } = await timed(`linkedin:${slug(linkedinUrl)}`, async () => {
    const profileRun = await runActor<Record<string, unknown>>({
      actorId: 'harvestapi/linkedin-profile-scraper',
      input: {
        queries: [linkedinUrl],
        profileScraperMode: 'Profile details no email ($4 per 1k)',
      },
      timeoutSecs: 180,
    });
    const profileRaw = profileRun.items[0] ?? {};
    const profile: LinkedinProfile = {
      fullName: pickString(profileRaw, ['fullName', 'name']),
      headline: pickString(profileRaw, ['headline']),
      followersCount: pickNumber(profileRaw, ['followersCount', 'followers']),
      connectionsCount: pickNumber(profileRaw, ['connectionsCount', 'connections']),
      about: pickString(profileRaw, ['about', 'summary']),
      experience: (profileRaw['experience'] as unknown[]) ?? [],
      rawJson: profileRaw,
    };

    const postsRun = await runActor<Record<string, unknown>>({
      actorId: 'harvestapi/linkedin-profile-posts',
      input: {
        targetUrls: [linkedinUrl],
        maxPosts: 30,
        postedLimit: '3months',
      },
      timeoutSecs: 180,
    });
    const posts: LinkedinPost[] = postsRun.items.map((p) => ({
      postedAt: pickString(p, ['postedAt', 'publishedAt', 'date']),
      text: pickString(p, ['text', 'content']),
      reactions: pickNumber(p, ['reactions', 'totalReactions', 'likes']),
      comments: pickNumber(p, ['comments', 'commentsCount']),
      shares: pickNumber(p, ['shares', 'sharesCount', 'reposts']),
      url: pickString(p, ['url', 'postUrl']),
    }));

    return { profile, posts };
  });

  const followers = result.profile.followersCount ?? 0;
  const totalEngagement = result.posts.reduce(
    (acc, p) => acc + (p.reactions ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
    0,
  );
  const avgEngagement = result.posts.length ? totalEngagement / result.posts.length : 0;
  const postsPerMonth = result.posts.length / 3;

  return {
    profile: result.profile,
    posts: result.posts,
    metrics: { followers, avgEngagement, postsPerMonth },
    timing,
    cost: [
      apifyCost('linkedin_profile', 1),
      apifyCost('linkedin_posts', result.posts.length),
    ],
  };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim().length) return v;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && /^\d+$/.test(v)) return parseInt(v, 10);
  }
  return undefined;
}

function slug(url: string): string {
  return url.replace(/[^a-z0-9]+/gi, '-').slice(0, 40);
}
