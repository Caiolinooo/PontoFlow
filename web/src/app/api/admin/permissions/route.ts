import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const supabase = getServiceSupabase();

  // List users with their permissions (per tenant)
  const [{ data: users }, { data: perms }] = await Promise.all([
    supabase
      .from('users_unified')
      .select('id,email,first_name,last_name,role,active,created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_permissions')
      .select('user_id,module,permission,resource')
      .eq('tenant_id', user.tenant_id as string)
  ]);

  const byUser: Record<string, any[]> = {};
  for (const p of perms ?? []) {
    if (!byUser[p.user_id]) byUser[p.user_id] = [];
    byUser[p.user_id].push({ module: p.module, permission: p.permission, resource: p.resource });
  }

  return NextResponse.json({
    users: (users ?? []).map(u => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      role: u.role,
      active: u.active,
      permissions: byUser[u.id] ?? []
    }))
  });
}

