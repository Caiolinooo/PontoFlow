import { NextRequest, NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { resolveDpDeliveryConfig } from '@/lib/dp/delivery';

// GET /api/admin/dp/deliveries/[id]/file - stream do PDF do bucket privado
export async function GET(_req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    await requireApiRole(['ADMIN']);
    const { id } = await context.params;
    const supabase = getServiceSupabase();

    const { data: row, error } = await supabase
      .from('dp_deliveries')
      .select('storage_path, storage_bucket, tenant_id')
      .eq('id', id)
      .single();
    if (error || !row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const bucket = row.storage_bucket
      || (await resolveDpDeliveryConfig(supabase, row.tenant_id))?.bucket;
    if (!bucket) return NextResponse.json({ error: 'dp_delivery_not_configured' }, { status: 409 });

    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(row.storage_path);
    if (dlErr || !file) return NextResponse.json({ error: dlErr?.message ?? 'file_not_found' }, { status: 404 });

    const filename = row.storage_path.split('/').pop() ?? 'folha-de-ponto.pdf';
    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
