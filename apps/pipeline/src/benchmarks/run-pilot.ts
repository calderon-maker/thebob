/**
 * Benchmark do piloto Fractional CMO Brasil (10 pessoas), versão 2.
 *
 * Fluxo por pessoa:
 *   Fase 1 (paralelo): LinkedIn + Firecrawl-media + Firecrawl-recognition
 *   Fase 2 (paralelo): resolve-handles (depende de LinkedIn) + claude-sentiment (depende de mídia)
 *   Fase 3 (paralelo): Instagram + TikTok + YouTube (depende dos handles)
 *
 * Saídas em apps/pipeline/benchmarks/results-fractional-cmo-<data>.{json,md}.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverFractionalCmoBR, type DiscoveredPerson } from '../tasks/discover-linkedin.js';
import { scrapeLinkedin, type LinkedinResult } from '../tasks/linkedin.js';
import { scrapeInstagram } from '../tasks/instagram.js';
import { scrapeTiktok } from '../tasks/tiktok.js';
import { scrapeYoutube } from '../tasks/youtube.js';
import { searchMediaMentions, type FirecrawlMediaResult } from '../tasks/firecrawl-media.js';
import { searchRecognition } from '../tasks/firecrawl-recognition.js';
import { scrapeTrends } from '../tasks/google-trends.js';
import { analyzeSentiment } from '../tasks/claude-sentiment.js';
import { resolveHandles, type ResolvedHandles } from '../tasks/resolve-handles.js';
import { sumUsd, type CostEntry } from '../lib/cost.js';
import type { Timing } from '../lib/timer.js';

const __filename = fileURLToPath(import.meta.url);
const PILOT_DIR = resolve(dirname(__filename), '..', '..', 'benchmarks');
const TODAY = new Date().toISOString().slice(0, 10);
const VERTICAL = 'fractional-cmo';

interface PerCrawlerStat {
  crawler: string;
  durationMs: number;
  costUsd: number;
  ok: boolean;
  error?: string;
}

interface PersonResult {
  person: DiscoveredPerson;
  resolvedHandles?: ResolvedHandles;
  stats: PerCrawlerStat[];
  payload: Record<string, unknown>;
}

async function main() {
  await mkdir(PILOT_DIR, { recursive: true });
  const t0 = Date.now();

  console.info(`[pilot] descoberta de 10 ${VERTICAL} BR`);
  const discovered = await discoverFractionalCmoBR(10);
  console.info(`[pilot] descobertos ${discovered.people.length} perfis em ${discovered.timing.durationMs}ms`);

  const allCosts: CostEntry[] = [...discovered.cost];
  const allTimings: Timing[] = [discovered.timing];
  const personResults: PersonResult[] = [];

  for (const [i, person] of discovered.people.entries()) {
    console.info(`\n[pilot] ${i + 1}/${discovered.people.length}, ${person.fullName}`);
    const stats: PerCrawlerStat[] = [];
    const payload: Record<string, unknown> = {};

    // Fase 1, paralelo: LinkedIn, Firecrawl-media, Firecrawl-recognition
    const phase1 = await Promise.allSettled([
      scrapeLinkedin(person.linkedinUrl).then((r) => ({ name: 'linkedin' as const, r })),
      searchMediaMentions(person.fullName).then((r) => ({ name: 'firecrawl-media' as const, r })),
      searchRecognition(person.fullName).then((r) => ({ name: 'firecrawl-recognition' as const, r })),
    ]);

    let linkedinResult: LinkedinResult | undefined;
    let mediaResult: FirecrawlMediaResult | undefined;
    for (const p of phase1) {
      if (p.status === 'fulfilled') {
        const { name, r } = p.value;
        allCosts.push(...r.cost);
        allTimings.push(r.timing);
        stats.push({ crawler: name, durationMs: r.timing.durationMs, costUsd: sumUsd(r.cost), ok: true });
        payload[name] = r;
        if (name === 'linkedin') linkedinResult = r as LinkedinResult;
        if (name === 'firecrawl-media') mediaResult = r as FirecrawlMediaResult;
        console.info(`  ✓ ${name.padEnd(22)} ${r.timing.durationMs}ms  $${sumUsd(r.cost).toFixed(4)}`);
      } else {
        console.warn(`  ✗ phase1 falhou: ${p.reason}`);
        stats.push({ crawler: 'phase1-error', durationMs: 0, costUsd: 0, ok: false, error: String(p.reason) });
      }
    }

    // Fase 2, paralelo: resolve-handles (depende do LinkedIn) + claude-sentiment (depende da mídia)
    const phase2Tasks: Promise<unknown>[] = [];
    let handles: ResolvedHandles | undefined;

    console.info(`  · phase2 entry, linkedinResult=${linkedinResult ? 'yes' : 'no'}, mediaMentions=${mediaResult?.mentions.length ?? 0}`);

    if (linkedinResult) {
      const ctx = {
        fullName: person.fullName,
        publicIdentifier: undefined,
        headline: person.headline,
        about: linkedinResult.profile.about,
      };
      phase2Tasks.push(
        resolveHandles(ctx, linkedinResult.profile)
          .then((r) => {
            handles = r;
            allCosts.push(...r.cost);
            allTimings.push(r.timing);
            stats.push({ crawler: 'resolve-handles', durationMs: r.timing.durationMs, costUsd: sumUsd(r.cost), ok: true });
            payload['resolve-handles'] = r;
            console.info(
              `  ✓ ${'resolve-handles'.padEnd(22)} ${r.timing.durationMs}ms  $${sumUsd(r.cost).toFixed(4)}  ig=${r.instagram ?? '-'} tt=${r.tiktok ?? '-'} yt=${r.youtube ? 'sim' : '-'}`,
            );
          })
          .catch((err) => {
            console.error(`  ✗ resolve-handles falhou para ${person.fullName}:`, err);
            stats.push({ crawler: 'resolve-handles', durationMs: 0, costUsd: 0, ok: false, error: String(err) });
          }),
      );
    }

    if (mediaResult && mediaResult.mentions.length > 0) {
      phase2Tasks.push(
        analyzeSentiment({
          fullName: person.fullName,
          mentions: mediaResult.mentions,
        }).then((r) => {
          allCosts.push(...r.cost);
          allTimings.push(r.timing);
          stats.push({ crawler: 'claude-sentiment', durationMs: r.timing.durationMs, costUsd: sumUsd(r.cost), ok: true });
          payload['claude-sentiment'] = r;
          console.info(`  ✓ ${'claude-sentiment'.padEnd(22)} ${r.timing.durationMs}ms  $${sumUsd(r.cost).toFixed(4)}`);
        }),
      );
    }

    await Promise.allSettled(phase2Tasks);

    // Fase 3, paralelo: Instagram, TikTok, YouTube com handles reais + Google Trends
    const igHandle = handles?.instagram ?? null;
    const ttHandle = handles?.tiktok ?? null;
    const ytHandle = handles?.youtube ?? null;

    const phase3 = await Promise.allSettled([
      scrapeInstagram(igHandle).then((r) => ({ name: 'instagram' as const, r })),
      scrapeTiktok(ttHandle).then((r) => ({ name: 'tiktok' as const, r })),
      scrapeYoutube(ytHandle).then((r) => ({ name: 'youtube' as const, r })),
      scrapeTrends(person.fullName).then((r) => ({ name: 'google-trends' as const, r })),
    ]);

    for (const p of phase3) {
      if (p.status === 'fulfilled') {
        const { name, r } = p.value;
        allCosts.push(...r.cost);
        allTimings.push(r.timing);
        stats.push({ crawler: name, durationMs: r.timing.durationMs, costUsd: sumUsd(r.cost), ok: true });
        payload[name] = r;
        const found = (r as { found?: boolean }).found;
        console.info(
          `  ${found === false ? '○' : '✓'} ${name.padEnd(22)} ${r.timing.durationMs}ms  $${sumUsd(r.cost).toFixed(4)}${found === false ? '  (sem handle/skip)' : ''}`,
        );
      } else {
        stats.push({ crawler: 'phase3-error', durationMs: 0, costUsd: 0, ok: false, error: String(p.reason) });
      }
    }

    personResults.push({ person, resolvedHandles: handles, stats, payload });
  }

  const totalMs = Date.now() - t0;
  const totalUsd = sumUsd(allCosts);

  const report = buildReport({
    vertical: VERTICAL,
    runDate: TODAY,
    totalMs,
    totalUsd,
    discovered: discovered.people,
    personResults,
    costs: allCosts,
  });

  const jsonPath = resolve(PILOT_DIR, `results-${VERTICAL}-${TODAY}-v2.json`);
  const mdPath = resolve(PILOT_DIR, `results-${VERTICAL}-${TODAY}-v2.md`);
  await writeFile(
    jsonPath,
    JSON.stringify(
      { vertical: VERTICAL, runDate: TODAY, totalMs, totalUsd, personResults, allCosts, allTimings },
      null,
      2,
    ),
  );
  await writeFile(mdPath, report);

  console.info(`\n[pilot] finalizado em ${(totalMs / 1000).toFixed(1)}s, custo total $${totalUsd.toFixed(2)}`);
  console.info(`  raw : ${jsonPath}`);
  console.info(`  md  : ${mdPath}`);
}

interface ReportArgs {
  vertical: string;
  runDate: string;
  totalMs: number;
  totalUsd: number;
  discovered: DiscoveredPerson[];
  personResults: PersonResult[];
  costs: CostEntry[];
}

function buildReport(a: ReportArgs): string {
  const byCrawler = new Map<string, { total: number; count: number; totalMs: number; oks: number; fails: number }>();
  for (const pr of a.personResults) {
    for (const s of pr.stats) {
      const cur = byCrawler.get(s.crawler) ?? { total: 0, count: 0, totalMs: 0, oks: 0, fails: 0 };
      cur.total += s.costUsd;
      cur.count += 1;
      cur.totalMs += s.durationMs;
      cur.oks += s.ok ? 1 : 0;
      cur.fails += s.ok ? 0 : 1;
      byCrawler.set(s.crawler, cur);
    }
  }

  const usdToBrl = 5.0;
  const perPerson = a.totalUsd / Math.max(a.discovered.length, 1);
  const proj50 = perPerson * 50;
  const proj500 = perPerson * 500;

  const crawlerTable = [...byCrawler.entries()]
    .map(([crawler, v]) => {
      const avgMs = v.count ? Math.round(v.totalMs / v.count) : 0;
      const avgUsd = v.count ? v.total / v.count : 0;
      return `| ${crawler} | ${v.count} | ${v.oks}/${v.count} | ${avgMs} ms | $${avgUsd.toFixed(4)} | $${v.total.toFixed(3)} |`;
    })
    .join('\n');

  const peopleTable = a.personResults
    .map((pr, i) => {
      const usd = pr.stats.reduce((acc, s) => acc + s.costUsd, 0);
      const ms = pr.stats.reduce((acc, s) => acc + s.durationMs, 0);
      const ig = pr.resolvedHandles?.instagram ?? '-';
      const tt = pr.resolvedHandles?.tiktok ?? '-';
      const yt = pr.resolvedHandles?.youtube ? '✓' : '-';
      return `| ${i + 1} | ${pr.person.fullName} | ${ig} | ${tt} | ${yt} | ${ms} ms | $${usd.toFixed(4)} |`;
    })
    .join('\n');

  const handleHits = a.personResults.reduce(
    (acc, pr) => {
      if (pr.resolvedHandles?.instagram) acc.ig += 1;
      if (pr.resolvedHandles?.tiktok) acc.tt += 1;
      if (pr.resolvedHandles?.youtube) acc.yt += 1;
      return acc;
    },
    { ig: 0, tt: 0, yt: 0 },
  );

  return `# Benchmark TheBob, piloto ${a.vertical} v2, ${a.runDate}

> Rodada de teste com **10 pessoas** + resolver de handles sociais ativo.
> Fluxo: discovery → LinkedIn + mídia + reconhecimento (paralelo) → resolve-handles + sentiment → IG + TikTok + YouTube + Trends (paralelo).

## Sumário executivo

| Métrica | Valor |
|---|---|
| Pessoas processadas | ${a.discovered.length} |
| Tempo total | ${(a.totalMs / 1000).toFixed(1)} s |
| Custo total | **$${a.totalUsd.toFixed(2)} USD** (~R$ ${(a.totalUsd * usdToBrl).toFixed(2)}) |
| Custo médio por pessoa | $${perPerson.toFixed(4)} (~R$ ${(perPerson * usdToBrl).toFixed(2)}) |
| Projeção 1 lista (50 pessoas) | $${proj50.toFixed(2)} (~R$ ${(proj50 * usdToBrl).toFixed(2)}) |
| Projeção 10 listas (500 pessoas) | $${proj500.toFixed(2)} (~R$ ${(proj500 * usdToBrl).toFixed(2)}) |
| **IG resolvido** | ${handleHits.ig}/${a.discovered.length} |
| **TikTok resolvido** | ${handleHits.tt}/${a.discovered.length} |
| **YouTube resolvido** | ${handleHits.yt}/${a.discovered.length} |

Custo orçado no plano (memoria_projeto §Stack): R$ 1.700/mês infra. Comparativo: rodar 500 pessoas custa ~R$ ${(proj500 * usdToBrl).toFixed(0)} por execução, 1 execução/mês cabe folgado.

## Custo e tempo por crawler

| Crawler | Execuções | Sucesso | Tempo médio | Custo médio | Custo total |
|---|---|---|---|---|---|
${crawlerTable}

## Resultado por pessoa

| # | Nome | IG handle | TikTok handle | YT | Tempo | Custo |
|---|---|---|---|---|---|---|
${peopleTable}

## Próximos passos sugeridos

1. Score compute com pesos 25/15/20/25/15 em \`src/score/compute.ts\`
2. Persistir os 10 perfis em Supabase (\`profiles\` + \`raw_signals\` jsonb)
3. Camada de filiação institucional (cruzamento com listas de associados ABRADI/IAB/Aberje)
4. Trocar Firecrawl search por Tavily ou Exa para qualidade de mídia
5. Resolver Google Trends (Firecrawl scrape direto da URL pública)
`;
}

main().catch((err) => {
  console.error('[pilot] erro fatal', err);
  process.exit(1);
});
