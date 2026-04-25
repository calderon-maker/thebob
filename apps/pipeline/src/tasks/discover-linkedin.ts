import { runActor } from '../lib/apify.js';
import { apifyCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface DiscoveredPerson {
  fullName: string;
  headline: string;
  linkedinUrl: string;
  location?: string;
}

export interface DiscoverResult {
  people: DiscoveredPerson[];
  timing: Timing;
  cost: CostEntry[];
  raw: {
    runId: string;
    datasetId: string;
  };
}

const SEARCH_QUERY = 'fractional CMO';

export async function discoverFractionalCmoBR(limit = 10): Promise<DiscoverResult> {
  const { result, timing } = await timed('discover-linkedin', async () => {
    const { items, runId, datasetId } = await runActor<{
      id?: string;
      name?: string;
      position?: string;
      linkedinProfileUrl?: string;
      location?: { linkedinText?: string };
      services?: string[];
    }>({
      actorId: 'harvestapi/linkedin-profile-search-by-services',
      input: {
        search: SEARCH_QUERY,
        locations: ['Brazil'],
        maxItems: limit * 2,
        profileScraperMode: 'Short',
      },
      timeoutSecs: 600,
    });

    const seen = new Set<string>();
    const people: DiscoveredPerson[] = [];
    for (const it of items) {
      const url = it.linkedinProfileUrl;
      const name = it.name?.trim();
      if (!url || !name) continue;
      const key = url.toLowerCase().split('?')[0] ?? url.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      people.push({
        fullName: name,
        headline: it.position ?? '',
        linkedinUrl: url,
        location: it.location?.linkedinText,
      });
      if (people.length >= limit) break;
    }
    return { people, runId, datasetId };
  });

  return {
    people: result.people,
    timing,
    cost: [apifyCost('linkedin_search', result.people.length)],
    raw: { runId: result.runId, datasetId: result.datasetId },
  };
}
