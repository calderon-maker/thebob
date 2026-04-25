/**
 * Resolução de handles sociais (Instagram, TikTok, YouTube) a partir do
 * perfil LinkedIn já coletado. Estratégia em 3 camadas:
 *
 * 1. Gera candidatos determinísticos (slug do LinkedIn, nome normalizado, etc.)
 * 2. Pede ao Claude até 3 candidatos prováveis com base no contexto profissional
 * 3. Valida cada candidato via Apify (mesmo actor que usamos no scrape principal)
 *    e fica com aquele cujo display name bate com o nome real (Levenshtein simples).
 *
 * Custo médio estimado: $0,005 - $0,015 por pessoa (Claude + algumas validações).
 */

import { CLAUDE_MODEL, getAnthropic } from '../lib/claude.js';
import { runActor } from '../lib/apify.js';
import { apifyCost, claudeCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';
import type { LinkedinProfile } from './linkedin.js';

export interface ResolvedHandles {
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  candidates: {
    instagram: string[];
    tiktok: string[];
    youtube: string[];
  };
  matched: {
    instagram?: { handle: string; displayName: string; nameScore: number };
    tiktok?: { handle: string; displayName: string; nameScore: number };
    youtube?: { handle: string; channelTitle: string; nameScore: number };
  };
  timing: Timing;
  cost: CostEntry[];
}

interface PersonContext {
  fullName: string;
  publicIdentifier?: string;
  headline?: string;
  about?: string;
  services?: string[];
  currentCompany?: string;
}

export async function resolveHandles(
  person: PersonContext,
  linkedinProfile: LinkedinProfile,
): Promise<ResolvedHandles> {
  const allCosts: CostEntry[] = [];
  const { result, timing } = await timed('resolve-handles', async () => {
    const context: PersonContext = {
      ...person,
      publicIdentifier: pickPid(linkedinProfile, person.publicIdentifier),
      headline: person.headline ?? linkedinProfile.headline,
      about: linkedinProfile.about,
    };

    const deterministic = generateCandidates(context);
    const claudeSugg = await claudeSuggest(context);
    allCosts.push(...claudeSugg.cost);

    const candidates = {
      instagram: dedup([...deterministic, ...claudeSugg.handles.instagram]),
      tiktok: dedup([...deterministic, ...claudeSugg.handles.tiktok]),
      youtube: dedup([
        context.fullName,
        ...claudeSugg.handles.youtube,
      ].filter(Boolean) as string[]),
    };

    const [igMatch, ttMatch, ytMatch] = await Promise.all([
      validateInstagram(context.fullName, candidates.instagram, allCosts),
      validateTiktok(context.fullName, candidates.tiktok, allCosts),
      validateYoutube(context.fullName, candidates.youtube, allCosts),
    ]);

    return {
      instagram: igMatch?.handle ?? null,
      tiktok: ttMatch?.handle ?? null,
      youtube: ytMatch?.handle ?? null,
      candidates,
      matched: {
        ...(igMatch ? { instagram: igMatch } : {}),
        ...(ttMatch ? { tiktok: ttMatch } : {}),
        ...(ytMatch ? { youtube: ytMatch } : {}),
      },
    };
  });

  return { ...result, timing, cost: allCosts };
}

function pickPid(profile: LinkedinProfile, fallback?: string): string | undefined {
  const raw = profile.rawJson as { publicIdentifier?: string } | undefined;
  return raw?.publicIdentifier ?? fallback;
}

function generateCandidates(p: PersonContext): string[] {
  const cand: string[] = [];
  const slug = p.publicIdentifier?.toLowerCase();
  if (slug && !slug.startsWith('acoaa')) cand.push(slug);

  const cleanName = stripDiacritics(p.fullName)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]!;
    const last = parts[parts.length - 1]!;
    cand.push(`${first}${last}`);
    cand.push(`${first}.${last}`);
    cand.push(`${first}_${last}`);
    if (first.length > 0) cand.push(`${first[0]}${last}`);
    cand.push(parts.join(''));
  } else if (parts.length === 1) {
    cand.push(parts[0]!);
  }
  return dedup(cand);
}

async function claudeSuggest(p: PersonContext): Promise<{
  handles: { instagram: string[]; tiktok: string[]; youtube: string[] };
  cost: CostEntry[];
}> {
  const client = getAnthropic();
  const prompt = `Você ajuda a descobrir handles públicos de redes sociais a partir de dados profissionais do LinkedIn.

Pessoa: ${p.fullName}
LinkedIn slug: ${p.publicIdentifier ?? '?'}
Headline: ${p.headline ?? '?'}
About (primeiros 400 chars): ${(p.about ?? '').slice(0, 400)}

Liste **até 3** handles prováveis para Instagram, **até 2** para TikTok e **até 2** para YouTube (channel ID, @handle, ou nome de canal). Inclua só o handle puro (sem URL e sem @). Se for improvável que a pessoa tenha presença na plataforma (ex: executivo brasileiro raramente em TikTok), retorne array vazio.

Responda em JSON estrito:
{"instagram":[],"tiktok":[],"youtube":[]}`;

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('\n');
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match
      ? (JSON.parse(match[0]) as {
          instagram?: string[];
          tiktok?: string[];
          youtube?: string[];
        })
      : {};
    return {
      handles: {
        instagram: (parsed.instagram ?? []).map(cleanHandle).filter(Boolean) as string[],
        tiktok: (parsed.tiktok ?? []).map(cleanHandle).filter(Boolean) as string[],
        youtube: (parsed.youtube ?? []).map(cleanHandle).filter(Boolean) as string[],
      },
      cost: [claudeCost(response.usage.input_tokens, response.usage.output_tokens)],
    };
  } catch (err) {
    console.warn(`[resolve-handles] claude falhou para ${p.fullName}`, err);
    return { handles: { instagram: [], tiktok: [], youtube: [] }, cost: [] };
  }
}

function cleanHandle(h: string): string {
  return h.replace(/^@/, '').replace(/^https?:\/\/[^/]+\//i, '').replace(/[\s/?#].*$/, '').trim();
}

async function validateInstagram(
  fullName: string,
  candidates: string[],
  costs: CostEntry[],
): Promise<{ handle: string; displayName: string; nameScore: number } | undefined> {
  if (candidates.length === 0) return undefined;
  const usernames = candidates.slice(0, 5);
  try {
    const { items } = await runActor<{ username?: string; fullName?: string; full_name?: string }>({
      actorId: 'apify/instagram-profile-scraper',
      input: { usernames },
      timeoutSecs: 120,
    });
    costs.push(apifyCost('instagram_profile', items.length));
    let best: { handle: string; displayName: string; nameScore: number } | undefined;
    for (const it of items) {
      const handle = it.username;
      const display = it.fullName ?? it.full_name ?? '';
      if (!handle) continue;
      const score = nameSimilarity(fullName, display);
      if (!best || score > best.nameScore) {
        best = { handle, displayName: display, nameScore: score };
      }
    }
    if (best && best.nameScore >= 0.4) return best;
    return undefined;
  } catch (err) {
    console.warn(`[resolve-handles] IG validate falhou`, err);
    return undefined;
  }
}

async function validateTiktok(
  fullName: string,
  candidates: string[],
  costs: CostEntry[],
): Promise<{ handle: string; displayName: string; nameScore: number } | undefined> {
  if (candidates.length === 0) return undefined;
  const profiles = candidates.slice(0, 5);
  try {
    const { items } = await runActor<{
      authorMeta?: { name?: string; nickName?: string };
    }>({
      actorId: 'clockworks/free-tiktok-scraper',
      input: { profiles, resultsPerPage: 1, shouldDownloadVideos: false },
      timeoutSecs: 180,
    });
    costs.push(apifyCost('tiktok_profile', items.length));
    let best: { handle: string; displayName: string; nameScore: number } | undefined;
    const seen = new Set<string>();
    for (const v of items) {
      const author = v.authorMeta;
      const handle = author?.name;
      if (!handle || seen.has(handle)) continue;
      seen.add(handle);
      const display = author?.nickName ?? '';
      const score = nameSimilarity(fullName, display);
      if (!best || score > best.nameScore) {
        best = { handle, displayName: display, nameScore: score };
      }
    }
    if (best && best.nameScore >= 0.4) return best;
    return undefined;
  } catch (err) {
    console.warn(`[resolve-handles] TikTok validate falhou`, err);
    return undefined;
  }
}

async function validateYoutube(
  fullName: string,
  candidates: string[],
  costs: CostEntry[],
): Promise<{ handle: string; channelTitle: string; nameScore: number } | undefined> {
  if (candidates.length === 0) return undefined;
  try {
    const { items } = await runActor<{
      channelName?: string;
      channelUrl?: string;
      channelId?: string;
    }>({
      actorId: 'streamers/youtube-scraper',
      input: {
        searchKeywords: fullName,
        maxResults: 5,
      },
      timeoutSecs: 120,
    });
    costs.push(apifyCost('youtube_channel', items.length));
    let best: { handle: string; channelTitle: string; nameScore: number } | undefined;
    for (const it of items) {
      const channel = it.channelName ?? '';
      const url = it.channelUrl ?? '';
      const score = nameSimilarity(fullName, channel);
      if (!best || score > best.nameScore) {
        best = { handle: url || it.channelId || '', channelTitle: channel, nameScore: score };
      }
    }
    if (best && best.nameScore >= 0.6 && best.handle) return best;
    return undefined;
  } catch (err) {
    console.warn(`[resolve-handles] YouTube validate falhou`, err);
    return undefined;
  }
}

function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const ax = stripDiacritics(a).toLowerCase().split(/\s+/).filter(Boolean);
  const bx = stripDiacritics(b).toLowerCase().split(/\s+/).filter(Boolean);
  if (ax.length === 0 || bx.length === 0) return 0;
  const aSet = new Set(ax);
  let hit = 0;
  for (const w of bx) if (aSet.has(w)) hit += 1;
  const denom = Math.max(ax.length, bx.length);
  return denom > 0 ? hit / denom : 0;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function dedup(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim().toLowerCase()).filter(Boolean))];
}
