import {NextRequest, NextResponse} from 'next/server';
import {requireApiAuth} from '@/lib/auth/server';
import { getServiceSupabase } from '@/lib/supabase/server';
import { getEffectivePeriodLock } from '@/lib/periods/resolver';
import { logAudit } from '@/lib/audit/logger';
import {z} from 'zod';

const EntrySchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  environment_id: z.string().uuid(),
  hora_ini: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/).or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v),
  observacao: z.string().max(1000).or(z.literal('')).nullable().optional().transform(v => v === '' ? null : v),
  face_score: z.number().min(0).max(1).optional()
});

// Support both single entry and batch insert
const Schema = z.union([
  EntrySchema,
  z.object({
    entries: z.array(EntrySchema).min(1).max(100) // Max 100 entries per batch
  })
]);

export async function POST(req: NextRequest, context: {params: Promise<{id: string}>}) {
  try {
    console.log('🔵 POST /api/employee/timesheets/[id]/entries - START');
    const user = await requireApiAuth();
    console.log('🔵 User authenticated:', user.id);

    const {id} = await context.params;
    console.log('🔵 Timesheet ID:', id);

    // Parse JSON with better error handling
    let json;
    try {
      json = await req.json();
      console.log('🔵 Request body:', JSON.stringify(json));
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Request headers:', Object.fromEntries(req.headers.entries()));
      return NextResponse.json({
        error: 'invalid_json',
        details: parseError instanceof Error ? parseError.message : 'Failed to parse JSON'
      }, {status: 400});
    }

    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      console.error('❌ Invalid body:', parsed.error.issues);
      console.error('❌ Received JSON:', JSON.stringify(json, null, 2));
      return NextResponse.json({error: 'invalid_body', issues: parsed.error.issues}, {status: 400});
    }

    console.log('✅ Schema validation passed');

    const supabase = getServiceSupabase();

    // Get timesheet and check ownership + lock
    const {data: ts, error: eTs} = await supabase
      .from('timesheets')
      .select('id, tenant_id, periodo_ini, employee_id')
      .eq('id', id)
      .single();

    if (eTs || !ts) {
      console.error('❌ Timesheet not found or error:', eTs?.message);
      return NextResponse.json({error: eTs?.message ?? 'not_found'}, {status: 404});
    }

    // Resolve current user's employee record
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('tenant_id', ts.tenant_id)
      .eq('profile_id', user.id)
      .limit(1)
      .maybeSingle();

    if (empError || !emp) {
      console.error('❌ Employee not found for user:', user.id);
      return NextResponse.json({ error: 'employee_not_found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && ts.employee_id !== emp.id) {
      console.error('❌ Forbidden: timesheet employee_id:', ts.employee_id, 'user employee_id:', emp.id);
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    console.log('✅ Employee verified:', emp.id);

    // Check period lock
    const monthKey = `${new Date(ts.periodo_ini).getFullYear()}-${String(new Date(ts.periodo_ini).getMonth()+1).padStart(2,'0')}-01`;
    const eff = await getEffectivePeriodLock(supabase, ts.tenant_id, ts.employee_id, monthKey);
    if (eff.locked && user.role !== 'ADMIN') {
      console.error('❌ Period is locked:', eff);
      return NextResponse.json({ error: 'period_locked', level: eff.level, reason: eff.reason ?? null }, { status: 400 });
    }

    // Determine if this is a batch insert or single entry
    const isBatch = 'entries' in parsed.data;
    type EntryInput = z.infer<typeof EntrySchema>;
    const entriesToCreate: EntryInput[] = isBatch
      ? (parsed.data as { entries: EntryInput[] }).entries
      : [parsed.data as EntryInput];

    console.log(`🔵 ${isBatch ? 'BATCH' : 'SINGLE'} insert - ${entriesToCreate.length} entries`);

    // Get all unique environment IDs
    const uniqueEnvIds = [...new Set(entriesToCreate.map((e: EntryInput) => e.environment_id))];

    // Fetch all environments in one query
    const { data: environments, error: envError } = await supabase
      .from('environments')
      .select('id, slug')
      .in('id', uniqueEnvIds);

    if (envError || !environments || environments.length === 0) {
      console.error('❌ Environments not found:', envError);
      return NextResponse.json({ error: 'environment_not_found' }, { status: 400 });
    }

    // Create a map for quick lookup
    const envMap = new Map(environments.map(e => [e.id, e.slug]));

    // Map environment slugs to valid tipo values
    const mapEnvironmentSlugToTipo = (slug: string): string => {
      const slugMap: Record<string, string> = {
        'embarque': 'embarque',
        'desembarque': 'desembarque',
        'offshore': 'trabalho',
        'regime-offshore': 'trabalho',
        'folga': 'folga',
        'pausa': 'pausa',
        'refeicao': 'refeicao',
        'almoco-start': 'trabalho', // Map "Almoço Start" to valid tipo
        'inicio': 'inicio',
        'fim': 'fim',
        'espera': 'espera',
        'trabalho': 'trabalho',
        'ferias': 'ferias',
        'licenca': 'licenca',
        'doenca': 'doenca',
        'treinamento': 'treinamento',
        'manutencao': 'manutencao',
        'viagem': 'viagem',
        'administrativo': 'administrativo'
      };

      return slugMap[slug.toLowerCase()] || 'trabalho'; // Default to 'trabalho' for unknown slugs
    };

    // Prepare all entries for batch insert
    const insertData = entriesToCreate.map((entry: EntryInput) => ({
      tenant_id: ts.tenant_id,
      timesheet_id: id,
      data: entry.data,
      tipo: mapEnvironmentSlugToTipo(envMap.get(entry.environment_id) || 'trabalho'),
      environment_id: entry.environment_id,
      hora_ini: entry.hora_ini ?? null,
      hora_fim: entry.hora_fim ?? null,
      observacao: entry.observacao ?? null
    }));

    console.log('🔵 Inserting entries into database...');
    const startTime = Date.now();

    const { data: insertedEntries, error: insertError } = await supabase
      .from('timesheet_entries')
      .insert(insertData)
      .select('*');

    const duration = Date.now() - startTime;
    console.log(`🔵 Insert completed in ${duration}ms`);

    if (insertError || !insertedEntries) {
      console.error('❌ Failed to insert entries:', insertError);
      return NextResponse.json({error: insertError?.message ?? 'Failed to create entries'}, {status: 400});
    }

    // Insert face verification records if scores are provided
    const verificationsData = insertedEntries.map((inserted, index) => {
       const score = entriesToCreate[index].face_score;
       if (score !== undefined && score !== null) {
          return {
             entry_id: inserted.id,
             employee_id: emp.id,
             verification_method: 'facial_recognition',
             face_match_score: score,
             is_verified: true,
             verified_at: new Date().toISOString()
          };
       }
       return null;
    }).filter(Boolean);

    if (verificationsData.length > 0) {
       const { error: verifyError } = await supabase.from('timesheet_entry_verifications').insert(verificationsData);
       if (verifyError) {
          console.error('❌ Failed to insert verifications:', verifyError);
       } else {
          console.log(`✅ Logged ${verificationsData.length} biometric verifications.`);
       }
    }

    // Audit log for batch (non-blocking)
    if (isBatch) {
      await logAudit({
        tenantId: ts.tenant_id,
        userId: user.id,
        action: 'batch_create',
        resourceType: 'timesheet_entry',
        resourceId: id,
        oldValues: null,
        newValues: {
          timesheet_id: id,
          count: insertedEntries.length,
          entries: insertedEntries.map(e => ({ id: e.id, data: e.data, environment_id: e.environment_id }))
        }
      });
    } else {
      await logAudit({
        tenantId: ts.tenant_id,
        userId: user.id,
        action: 'create',
        resourceType: 'timesheet_entry',
        resourceId: insertedEntries[0].id,
        oldValues: null,
        newValues: {
          timesheet_id: id,
          data: insertedEntries[0].data,
          environment_id: insertedEntries[0].environment_id,
          hora_ini: insertedEntries[0].hora_ini,
          hora_fim: insertedEntries[0].hora_fim,
        }
      });
    }

    console.log(`✅ ${insertedEntries.length} entries created successfully in ${duration}ms`);
    return NextResponse.json({
      ok: true,
      entries: insertedEntries,
      count: insertedEntries.length,
      duration_ms: duration
    });
  } catch (error) {
    console.error('❌ Unexpected error in POST /api/employee/timesheets/[id]/entries:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({error: 'unauthorized'}, {status: 401});
    }
    return NextResponse.json({error: 'internal_error', details: error instanceof Error ? error.message : 'Unknown error'}, {status: 500});
  }
}

