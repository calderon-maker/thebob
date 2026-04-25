import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY ausente, configure em .env.local');
  }
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export const CLAUDE_MODEL = 'claude-sonnet-4-6';
