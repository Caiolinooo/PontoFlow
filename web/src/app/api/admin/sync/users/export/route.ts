import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getApiUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/super-admin';

function verifyHmac(rawBody: string, headerSig: string | null, secret: string) {
  if (!headerSig) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = headerSig.startsWith('sha256=') ? headerSig.slice(7) : headerSig;
  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ADMIN_SYNC_SECRET;
    if (!secret) return NextResponse.json({ error: 'sync_disabled' }, { status: 403 });

    const raw = await req.text();
    const sig = req.headers.get('x-sync-signature');
    if (!verifyHmac(raw, sig, secret)) return NextResponse.json({ error: 'invalid_signature' }, { status: 403 });

    // SECURITY: Authenticate user and check admin role
    const user = await getApiUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'forbidden', message: 'Admin access required' }, { status: 403 });
    }

    const svc = getServiceSupabase();

    // MULTI-TENANT SECURITY:
    // - Super Admin (system owner + database entries): Exports ALL users from ALL tenants
    // - Regular Admin: Exports only users from THEIR tenant
    const isSuper = await isSuperAdmin(user.email);

    let query = svc.from('users_unified').select('*');

    if (!isSuper) {
      // Regular admin: filter by their tenant only
      if (!user.tenant_id) {
        return NextResponse.json({
          error: 'no_tenant',
          message: 'User has no tenant assigned'
        }, { status: 400 });
      }
      query = query.eq('tenant_id', user.tenant_id);
      console.log(`[export] Regular admin export: tenant_id=${user.tenant_id}, email=${user.email}`);
    } else {
      console.log(`[export] SUPER ADMIN export: ALL TENANTS, email=${user.email}`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      users: data ?? [],
      metadata: {
        exported_by: user.email,
        is_super_admin: isSuper,
        tenant_id: isSuper ? 'ALL' : user.tenant_id,
        exported_at: new Date().toISOString(),
        total_users: (data ?? []).length
      }
    });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    console.error('[export] Error:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

