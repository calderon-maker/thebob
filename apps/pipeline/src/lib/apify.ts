import { ApifyClient } from 'apify-client';

let cached: ApifyClient | null = null;

export function getApify(): ApifyClient {
  if (cached) return cached;
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN ausente, configure em .env.local');
  }
  cached = new ApifyClient({ token });
  return cached;
}

export interface RunActorOptions {
  actorId: string;
  input: Record<string, unknown>;
  timeoutSecs?: number;
  memoryMbytes?: number;
}

export async function runActor<T = unknown>(opts: RunActorOptions): Promise<{
  items: T[];
  runId: string;
  datasetId: string;
}> {
  const client = getApify();
  const run = await client.actor(opts.actorId).call(opts.input, {
    timeout: opts.timeoutSecs ?? 300,
    memory: opts.memoryMbytes ?? 1024,
  });
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return {
    items: items as T[],
    runId: run.id,
    datasetId: run.defaultDatasetId,
  };
}
