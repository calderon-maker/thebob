import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const startedAt = Date.now();

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    commit: process.env.GIT_COMMIT ?? 'unknown',
    uptime_seconds: Math.round((Date.now() - startedAt) / 1000),
    node: process.version,
    timestamp: new Date().toISOString(),
  });
}
