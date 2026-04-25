import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase';

export const runtime = 'nodejs';

const ProspectSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  linkedin_url: z.string().url().includes('linkedin.com'),
  segment: z.string().min(2),
  consent: z.literal(true),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = ProspectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou', issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('prospects').insert({
    full_name: parsed.data.full_name,
    email: parsed.data.email.toLowerCase(),
    linkedin_url: parsed.data.linkedin_url,
    segment: parsed.data.segment,
    consent: true,
    source: 'landing-thebob',
    user_agent: req.headers.get('user-agent') ?? null,
    ip_hash: hashIp(req.headers.get('x-forwarded-for') ?? ''),
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[prospects.insert]', error);
    return NextResponse.json({ error: 'Falha ao gravar' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function hashIp(ip: string) {
  if (!ip) return null;
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash * 31 + ip.charCodeAt(i)) | 0;
  }
  return String(hash);
}
