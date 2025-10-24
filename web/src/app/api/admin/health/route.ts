import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

function mask(val?: string, show = 4) {
  if (!val) return null as any;
  if (val.length <= show * 2) return val.replace(/.(?=..)/g, '*');
  return `${val.slice(0, show)}…${val.slice(-show)}`;
}

export async function GET() {
  try {
    await requireApiRole(['ADMIN']);

    const env = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
      service: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    } as const;

    const summary: any = {
      env: {
        urlPresent: !!env.url,
        anonPresent: !!env.anon,
        servicePresent: !!env.service,
        url: env.url || null,
        anonMasked: mask(env.anon ?? undefined),
        serviceMasked: mask(env.service ?? undefined),
      },
      checks: {},
      errors: {},
    };

    // Prefer service client when available
    const supabase = env.service ? getServiceSupabase() : await getServerSupabase();

    async function tableExists(name: string) {
      const { data, error } = await supabase.from(name as any).select('*', { count: 'exact', head: true }).limit(1);
      if (error) {
        const msg = (error as any).message || String(error);
        if (/does not exist|relation .* does not exist/i.test(msg)) return { exists: false, message: msg };
        // other error still means table likely exists but RLS/permission failed
        return { exists: true, message: msg };
      }
      return { exists: true, message: null };
    }

    // Basic connectivity
    const ping = await supabase.auth.getSession();
    summary.checks.serviceConnect = { ok: !ping.error, error: ping.error?.message || null };

    // Tables we rely on
    const tenants = await tableExists('tenants');
    const tenantSettings = await tableExists('tenant_settings');
    const usersUnified = await tableExists('users_unified');

    summary.checks.tables = {
      tenants,
      tenant_settings: tenantSettings,
      users_unified: usersUnified,
    };

    return NextResponse.json(summary);
  } catch (e: any) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e?.message || 'internal_error' }, { status: 500 });
  }
}

