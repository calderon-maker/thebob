import { CLAUDE_MODEL, getAnthropic } from '../lib/claude.js';
import { claudeCost, type CostEntry } from '../lib/cost.js';
import { timed, type Timing } from '../lib/timer.js';

export interface SentimentInput {
  fullName: string;
  mentions: Array<{ outlet: string; title: string; snippet?: string; url: string }>;
}

export interface SentimentResult {
  overall: 'positivo' | 'neutro' | 'negativo' | 'misto' | 'sem-dados';
  relevanceScore: number;
  summary: string;
  timing: Timing;
  cost: CostEntry[];
}

export async function analyzeSentiment(input: SentimentInput): Promise<SentimentResult> {
  const { result, timing } = await timed('claude-sentiment', async () => {
    if (input.mentions.length === 0) {
      return {
        overall: 'sem-dados' as const,
        relevanceScore: 0,
        summary: 'Sem menções na mídia especializada.',
        usage: { in: 0, out: 0 },
      };
    }

    const client = getAnthropic();
    const mentionList = input.mentions
      .slice(0, 30)
      .map((m, i) => `${i + 1}. [${m.outlet}] ${m.title}\n   ${m.snippet ?? ''}\n   ${m.url}`)
      .join('\n');

    const prompt = `Você é o BoB, analista do ranking TheBob para profissionais brasileiros de marketing digital.
Analise as menções abaixo sobre ${input.fullName} e responda em JSON estrito:
{
  "overall": "positivo" | "neutro" | "negativo" | "misto",
  "relevanceScore": 0-100,
  "summary": "1 parágrafo de até 60 palavras"
}

Menções:
${mentionList}`;

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { text: string }).text)
      .join('\n');

    let parsed: { overall: SentimentResult['overall']; relevanceScore: number; summary: string };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { overall: 'neutro', relevanceScore: 0, summary: text };
    } catch {
      parsed = { overall: 'neutro', relevanceScore: 0, summary: text.slice(0, 240) };
    }

    return {
      overall: parsed.overall,
      relevanceScore: parsed.relevanceScore ?? 0,
      summary: parsed.summary ?? '',
      usage: {
        in: response.usage.input_tokens,
        out: response.usage.output_tokens,
      },
    };
  });

  return {
    overall: result.overall,
    relevanceScore: result.relevanceScore,
    summary: result.summary,
    timing,
    cost: [claudeCost(result.usage.in, result.usage.out)],
  };
}
