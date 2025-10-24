import { createClient } from '@supabase/supabase-js';

export async function logAudit(params: {
  tenantId: string;
  userId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'approve' | 'reject' | 'submit' | 'manager_edit_closed_period' | 'employee_acknowledge_adjustment';
  resourceType: string;
  resourceId?: string | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('audit_log').insert({
      tenant_id: params.tenantId,
      user_id: params.userId,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
  } catch (e) {
    // Non-blocking: never throw from audit logger
    console.error('[audit] failed to log audit', e);
  }
}

