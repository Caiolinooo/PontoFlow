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

    const payload = {
      tenant_id: user.tenant_id,
      company_name: body.company_name ?? null,
      company_legal_name: body.company_legal_name ?? null,
      company_document: body.company_document ?? null,
      company_description: body.company_description ?? null,
      address_line1: body.address_line1 ?? null,
      address_line2: body.address_line2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postal_code: body.postal_code ?? null,
      country: body.country ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      website: body.website ?? null,
      logo_url: body.logo_url ?? null,
      watermark_text: body.watermark_text ?? null,
      watermark_url: body.watermark_url ?? null,
      legal_declaration_template: body.legal_declaration_template ?? null,
      updated_at: new Date().toISOString(),
    };

    const supabase = await getServerSupabase();
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

