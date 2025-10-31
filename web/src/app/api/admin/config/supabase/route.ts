import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import fs from 'node:fs';
import path from 'node:path';

function upsertEnv(content: string, key: string, value: string) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + `\n${line}\n`;
}

export async function PUT(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    const body = await req.json().catch(() => ({}));
    const { url, anon, service } = body || {};

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'config_write_disabled_in_production' }, { status: 405 });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf8'); } catch { content = ''; }

    if (url) content = upsertEnv(content, 'NEXT_PUBLIC_SUPABASE_URL', url);
    if (anon) content = upsertEnv(content, 'NEXT_PUBLIC_SUPABASE_ANON_KEY', anon);
    if (service) content = upsertEnv(content, 'SUPABASE_SERVICE_ROLE_KEY', service);

    fs.writeFileSync(envPath, content, 'utf8');

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'internal_error' }, { status: 500 });
  }
}

export const POST = PUT;

