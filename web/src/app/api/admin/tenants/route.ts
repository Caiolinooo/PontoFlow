import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

/**
 * Phase 14: Admin Tenant Management
 * 
 * GET /api/admin/tenants - List all tenants (admin only)
 * POST /api/admin/tenants - Create new tenant (admin only)
 */

export async function GET() {
  const user = await requireApiRole(['ADMIN']);
  const useService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = useService ? getServiceSupabase() : await getServerSupabase();

  try {
    let query = supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (!useService) {
      // In anon/session mode, restrict to user's tenant if available; if not, return vazio
      if (user.tenant_id) query = query.eq('id', user.tenant_id);
      else return NextResponse.json({ tenants: [] });
    }

    const { data: tenants, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ tenants });
  } catch (err) {
    console.error('GET tenants error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireApiRole(['ADMIN']);
    const supabase = getServiceSupabase();

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? '').trim();
    const slugRaw = String(body.slug ?? '').trim();
    const timezone = String(body.timezone ?? 'America/Sao_Paulo').trim();
    
    const slug = slugRaw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug' },
        { status: 400 }
      );
    }

    // Validate timezone
    const validTimezones = [
      'UTC',
      'America/Sao_Paulo', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
      'America/Mexico_City', 'America/Bogota', 'America/Lima', 'America/Argentina/Buenos_Aires',
      'America/Santiago',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
      'Europe/Amsterdam', 'Europe/Lisbon', 'Europe/Moscow',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore', 'Asia/Seoul',
      'Asia/Kuala_Lumpur', 'Asia/Bangkok', 'Asia/Dubai',
      'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg',
      'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
    ];

    if (!validTimezones.includes(timezone)) {
      return NextResponse.json(
        { error: 'Invalid timezone. Please select a valid timezone.' },
        { status: 400 }
      );
    }

    // Check duplicate slug for a clearer message before insert
    const { data: exists, error: existsErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();
    if (existsErr) {
      return NextResponse.json({ error: existsErr.message }, { status: 400 });
    }
    if (exists) {
      return NextResponse.json({ error: 'Slug já existe. Escolha outro.' }, { status: 409 });
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name,
        slug,
        timezone,
        description: body.description?.trim?.() || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, tenant }, { status: 201 });
  } catch (err: any) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    console.error('POST tenant error:', err);
    return NextResponse.json({ error: err?.message ?? 'internal_error' }, { status: 500 });
  }
}

