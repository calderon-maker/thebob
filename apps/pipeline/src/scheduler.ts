/**
 * Scheduler do TheBob.
 * Roda mensalmente (PM2 cron 0 2 1 * *) e enfileira jobs para os workers.
 *
 * Estratégia:
 *   1. Lê todos os profiles ativos
 *   2. Cria jobs por (plataforma × profile) na tabela `public.jobs`
 *   3. Workers consomem com `claim_next_job`
 *
 * Versão 0.1.0, esqueleto, ainda não enfileira nada de verdade.
 */

import { getSupabase } from './lib/supabase.js';

const PLATFORMS = ['linkedin', 'instagram', 'tiktok', 'youtube'] as const;
const FIRECRAWL_BATCH = 'firecrawl_mentions';
const CLAUDE_BATCH = 'claude_analyze';

async function main() {
  const supabase = getSupabase();
  const startedAt = new Date().toISOString();
  console.info(`[scheduler] iniciado em ${startedAt}`);

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, segment, role')
    .in('role', ['member', 'aspiring', 'watching']);

  if (error) {
    console.error('[scheduler] falha ao listar profiles', error);
    process.exit(1);
  }

  console.info(`[scheduler] ${profiles?.length ?? 0} profiles a processar`);

  const jobs: { type: string; payload: Record<string, unknown> }[] = [];

  for (const profile of profiles ?? []) {
    for (const platform of PLATFORMS) {
      jobs.push({
        type: platform,
        payload: { profile_id: profile.id, segment: profile.segment },
      });
    }
    jobs.push({
      type: FIRECRAWL_BATCH,
      payload: { profile_id: profile.id },
    });
    jobs.push({
      type: CLAUDE_BATCH,
      payload: { profile_id: profile.id },
    });
  }

  if (jobs.length > 0) {
    const { error: insertError } = await supabase.from('jobs').insert(jobs);
    if (insertError) {
      console.error('[scheduler] falha ao inserir jobs', insertError);
      process.exit(1);
    }
  }

  await supabase.from('events').insert({
    type: 'pipeline.scheduled',
    payload: { jobs_enfileirados: jobs.length, started_at: startedAt },
  });

  console.info(`[scheduler] enfileirou ${jobs.length} jobs, finalizado`);
}

main().catch((err) => {
  console.error('[scheduler] erro não tratado', err);
  process.exit(1);
});
