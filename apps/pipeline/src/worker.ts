/**
 * Worker do TheBob.
 * Loop infinito, claima 1 job por vez via `claim_next_job` (RPC),
 * executa, marca como done ou failed, dorme 2s e repete.
 *
 * Roda em cluster mode no PM2 (2 instâncias por padrão).
 *
 * Versão 0.1.0, esqueleto. Tasks reais em src/tasks/*.ts conforme
 * o `bcx-pipeline-data` SKILL.md.
 */

import { getSupabase } from './lib/supabase.js';

const POLL_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 3;
const WORKER_ID = process.env.WORKER_ID ?? `worker-${process.pid}`;

type JobType =
  | 'linkedin'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'firecrawl_mentions'
  | 'claude_analyze';

async function processJob(type: JobType, payload: unknown) {
  switch (type) {
    case 'linkedin':
    case 'instagram':
    case 'tiktok':
    case 'youtube':
      console.info(`[worker:${WORKER_ID}] coleta ${type}`, payload);
      // TODO: chamar tasks/<plataforma>.ts (Apify)
      return;
    case 'firecrawl_mentions':
      console.info(`[worker:${WORKER_ID}] firecrawl menções`, payload);
      // TODO: chamar tasks/firecrawl.ts
      return;
    case 'claude_analyze':
      console.info(`[worker:${WORKER_ID}] claude análise`, payload);
      // TODO: chamar tasks/claude-analyze.ts
      return;
    default:
      throw new Error(`Tipo de job desconhecido: ${type as string}`);
  }
}

async function loop() {
  const supabase = getSupabase();
  console.info(`[worker:${WORKER_ID}] iniciado, polling a cada ${POLL_INTERVAL_MS}ms`);

  while (true) {
    const { data: claimed, error: claimErr } = await supabase
      .rpc('claim_next_job' as never, { worker_id: WORKER_ID } as never)
      .single();

    if (claimErr || !claimed) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const job = claimed as {
      id: number;
      type: JobType;
      payload: unknown;
      attempts: number;
    };

    try {
      await processJob(job.type, job.payload);
      await supabase
        .from('jobs')
        .update({ status: 'done', finished_at: new Date().toISOString() })
        .eq('id', job.id);
    } catch (err) {
      const last_error = err instanceof Error ? err.message : String(err);
      const next_attempts = job.attempts + 1;
      const failed = next_attempts >= MAX_ATTEMPTS;
      await supabase
        .from('jobs')
        .update({
          status: failed ? 'failed' : 'pending',
          attempts: next_attempts,
          last_error,
          finished_at: failed ? new Date().toISOString() : null,
        })
        .eq('id', job.id);
      console.error(`[worker:${WORKER_ID}] job ${job.id} falhou`, err);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

loop().catch((err) => {
  console.error(`[worker:${WORKER_ID}] erro fatal`, err);
  process.exit(1);
});
