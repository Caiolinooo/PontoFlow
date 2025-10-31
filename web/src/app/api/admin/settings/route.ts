import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const supabase = await getServerSupabase();
    const { data } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ settings: data || null });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return PUT(req); }

export async function PUT(req: NextRequest) {
  try {
    const user = await requireApiRole(['ADMIN']);
    const body = await req.json().catch(() => ({}));

    const supabase = await getServerSupabase();

    // Get existing settings first
    const { data: existing } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    // Build payload with only fields that are present in body
    const payload: any = {
      tenant_id: user.tenant_id,
      updated_at: new Date().toISOString(),
    };

    // Only update fields that are present in the request
    if (body.company_name !== undefined) payload.company_name = body.company_name || null;
    if (body.company_legal_name !== undefined) payload.company_legal_name = body.company_legal_name || null;
    if (body.company_document !== undefined) payload.company_document = body.company_document || null;
    if (body.company_description !== undefined) payload.company_description = body.company_description || null;
    if (body.address_line1 !== undefined) payload.address_line1 = body.address_line1 || null;
    if (body.address_line2 !== undefined) payload.address_line2 = body.address_line2 || null;
    if (body.city !== undefined) payload.city = body.city || null;
    if (body.state !== undefined) payload.state = body.state || null;
    if (body.postal_code !== undefined) payload.postal_code = body.postal_code || null;
    if (body.country !== undefined) payload.country = body.country || null;
    if (body.phone !== undefined) payload.phone = body.phone || null;
    if (body.email !== undefined) payload.email = body.email || null;
    if (body.website !== undefined) payload.website = body.website || null;
    if (body.logo_url !== undefined) payload.logo_url = body.logo_url || null;
    if (body.watermark_text !== undefined) payload.watermark_text = body.watermark_text || null;
    if (body.watermark_url !== undefined) payload.watermark_url = body.watermark_url || null;
    if (body.legal_declaration_template !== undefined) payload.legal_declaration_template = body.legal_declaration_template || null;

    // Parse deadline_day (0 = last day of month, 1-31 = specific day)
    if (body.deadline_day !== undefined) {
      const parsed = parseInt(body.deadline_day, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 31) {
        payload.deadline_day = parsed;
      }
    }

    // Parse auto_approve_enabled
    if (body.auto_approve_enabled !== undefined) {
      payload.auto_approve_enabled = body.auto_approve_enabled === 'true' || body.auto_approve_enabled === true;
    }

    // Parse auto_lock_enabled (default: true)
    if (body.auto_lock_enabled !== undefined) {
      payload.auto_lock_enabled = body.auto_lock_enabled !== 'false' && body.auto_lock_enabled !== false;
    }

    // Parse auto_fill_enabled (default: true)
    if (body.auto_fill_enabled !== undefined) {
      payload.auto_fill_enabled = body.auto_fill_enabled !== 'false' && body.auto_fill_enabled !== false;
    }

    // Parse auto_fill_past_days (default: false)
    if (body.auto_fill_past_days !== undefined) {
      payload.auto_fill_past_days = body.auto_fill_past_days === 'true' || body.auto_fill_past_days === true;
    }

    // Parse auto_fill_future_days (default: true)
    if (body.auto_fill_future_days !== undefined) {
      payload.auto_fill_future_days = body.auto_fill_future_days !== 'false' && body.auto_fill_future_days !== false;
    }

    // Handle work_mode and timezone separately (they go to tenants table, not tenant_settings)
    if (body.work_mode !== undefined) {
      // Normalize work_mode values to ensure compatibility
      let normalizedWorkMode = body.work_mode;
      if (body.work_mode === 'padrao') {
        normalizedWorkMode = 'standard';
      } else if (body.work_mode === 'standard') {
        normalizedWorkMode = 'standard';
      }
      
      if (['offshore', 'standard', 'flexible'].includes(normalizedWorkMode)) {
        try {
          const { error: tenantError } = await supabase
            .from('tenants')
            .update({ work_mode: normalizedWorkMode })
            .eq('id', user.tenant_id);

          if (tenantError) {
            if (tenantError.code === '42703') {
              console.warn('Tenant work_mode column does not exist yet, skipping work_mode update');
            } else {
              console.error('Error updating tenant work_mode:', tenantError);
            }
          }
        } catch (err) {
          console.warn('Could not update work_mode in tenants table:', err);
        }
      }
    }

    // Handle timezone separately (it goes to tenants table, not tenant_settings)
    if (body.timezone !== undefined) {
      const validTimezones = [
        'America/Sao_Paulo',
        'America/New_York',
        'America/Los_Angeles',
        'America/Chicago',
        'America/Mexico_City',
        'America/Bogota',
        'America/Lima',
        'America/Argentina/Buenos_Aires',
        'America/Santiago',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Europe/Madrid',
        'Europe/Rome',
        'Europe/Amsterdam',
        'Europe/Lisbon',
        'Europe/Moscow',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Hong_Kong',
        'Asia/Singapore',
        'Asia/Seoul',
        'Asia/Kuala_Lumpur',
        'Asia/Bangkok',
        'Asia/Dubai',
        'Africa/Cairo',
        'Africa/Lagos',
        'Africa/Johannesburg',
        'Australia/Sydney',
        'Australia/Melbourne',
        'Pacific/Auckland',
        'UTC'
      ];

      if (validTimezones.includes(body.timezone)) {
        try {
          const { error: tenantError } = await supabase
            .from('tenants')
            .update({ timezone: body.timezone })
            .eq('id', user.tenant_id);

          if (tenantError) {
            if (tenantError.code === '42703') {
              console.warn('Tenant timezone column does not exist yet, skipping timezone update');
            } else {
              console.error('Error updating tenant timezone:', tenantError);
            }
          }
        } catch (err) {
          console.warn('Could not update timezone in tenants table:', err);
        }
      }
    }
    
    // Handle deadline_day in tenants table as well (migration support)
    if (body.deadline_day !== undefined) {
      try {
        const parsed = parseInt(body.deadline_day, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 31) {
          const { error: tenantError } = await supabase
            .from('tenants')
            .update({ deadline_day: parsed })
            .eq('id', user.tenant_id);

          if (tenantError) {
            if (tenantError.code === '42703') {
              console.warn('Tenant deadline_day column does not exist yet, skipping deadline_day update');
            } else {
              console.error('Error updating tenant deadline_day:', tenantError);
            }
          }
        }
      } catch (err) {
        console.warn('Could not update deadline_day in tenants table:', err);
      }
    }

    // upsert by tenant_id
    const { data, error } = await supabase
      .from('tenant_settings')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ settings: data });
  } catch (e) {
    if (e instanceof Error && (e.message === 'Unauthorized' || e.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

