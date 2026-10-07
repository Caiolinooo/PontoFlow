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
  face_score: z.number().min(0).max(1).optional(),
  verification_id: z.string().uuid().optional(),
  verified_offline: z.boolean().optional()
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

    // ── Biometric enforcement ───────────────────────────────────────────
    // If the employee has an active face template, every entry must carry either
    // a fresh server-side verification (verification_id, single-use, 15 min) or
    // an explicit offline attestation (verified_offline + face_score >= 0.5)
    // which is persisted as client-attested. Otherwise the punch is rejected.
    const VERIFICATION_WINDOW_MIN = 15;
    const OFFLINE_MIN_SCORE = 0.5;
    const validVerificationIds = new Set<string>();

    const { data: activeFace } = await supabase
      .from('employee_face_data')
      .select('id')
      .eq('employee_id', emp.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (activeFace) {
      const withoutProof = entriesToCreate.filter(
        (e) => !e.verification_id && !(e.verified_offline === true && typeof e.face_score === 'number' && e.face_score >= OFFLINE_MIN_SCORE)
      );
      if (withoutProof.length > 0) {
        console.error(`❌ ${withoutProof.length} entr(ies) without biometric proof`);
        await logAudit({
          tenantId: ts.tenant_id,
          userId: user.id,
          action: 'face_verification_required',
          resourceType: 'timesheet_entry',
          resourceId: id,
          oldValues: null,
          newValues: { timesheet_id: id, rejected_entries: withoutProof.length }
        });
        return NextResponse.json({
          error: 'face_verification_required',
          details: 'Each entry requires a recent facial verification (verification_id) or an offline attestation (verified_offline + face_score >= 0.5).'
        }, { status: 403 });
      }

      const requestedVerificationIds = [...new Set(
        entriesToCreate.map((e) => e.verification_id).filter((v): v is string => !!v)
      )];
      if (requestedVerificationIds.length > 0) {
        const since = new Date(Date.now() - VERIFICATION_WINDOW_MIN * 60 * 1000).toISOString();
        const { data: verifications } = await supabase
          .from('timesheet_entry_verifications')
          .select('id')
          .in('id', requestedVerificationIds)
          .eq('employee_id', emp.id)
          .eq('is_verified', true)
          .gte('verified_at', since);

        for (const v of verifications ?? []) validVerificationIds.add(v.id);

        // Anti-replay: a verification already linked to a previously created
        // entry cannot authorize new punches.
        const { data: alreadyUsed } = await supabase
          .from('timesheet_entries')
          .select('verification_id')
          .in('verification_id', requestedVerificationIds);
        const usedIds = new Set((alreadyUsed ?? []).map((r) => r.verification_id));

        const invalid = requestedVerificationIds.filter((vid) => !validVerificationIds.has(vid) || usedIds.has(vid));
        if (invalid.length > 0) {
          console.error('❌ Invalid/expired/reused verification ids:', invalid);
          await logAudit({
            tenantId: ts.tenant_id,
            userId: user.id,
            action: 'face_verification_required',
            resourceType: 'timesheet_entry',
            resourceId: id,
            oldValues: null,
            newValues: { timesheet_id: id, invalid_verification_ids: invalid }
          });
          return NextResponse.json({
            error: 'face_verification_invalid',
            details: 'verification_id is expired, failed, already used, or does not belong to this employee.'
          }, { status: 403 });
        }
      }
    }

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

    // Map environment slugs to the CANONICAL tipo vocabulary
    // (migrations/CANONICAL-SCHEMA-ALIGN.sql): 'normal','extra','feriado','folga'.
    // The environment itself is stored in environment_id; tipo classifies the day.
    const mapEnvironmentSlugToTipo = (slug: string): string => {
      return slug.toLowerCase() === 'folga' ? 'folga' : 'normal';
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
      observacao: entry.observacao ?? null,
      verification_id: entry.verification_id ?? null
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

    // Offline attestations: entries punched without connectivity carry
    // verified_offline + a client-computed score. Persist them as CLIENT-ATTESTED
    // verification rows (distinguishable from server-side verifications) and link
    // them back to their entries.
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    const offlineRows = insertedEntries
      .map((inserted, index) => ({ inserted, source: entriesToCreate[index] }))
      .filter(({ source }) => source.verified_offline === true && !source.verification_id)
      .map(({ inserted, source }) => ({
        entry_id: inserted.id,
        employee_id: emp.id,
        verification_method: 'facial_recognition_offline',
        face_match_score: source.face_score ?? null,
        is_verified: true,
        verified_at: new Date().toISOString(),
        device_info: { ip: ipAddress, user_agent: userAgent, attested: 'client_offline' },
        verification_notes: 'client_attested_offline'
      }));

    if (offlineRows.length > 0) {
      const { data: insertedVerifs, error: offlineError } = await supabase
        .from('timesheet_entry_verifications')
        .insert(offlineRows)
        .select('id, entry_id');
      if (offlineError) {
        console.error('❌ Failed to insert offline verifications:', offlineError);
      } else if (insertedVerifs) {
        await Promise.all(
          insertedVerifs.map((v) =>
            supabase.from('timesheet_entries').update({ verification_id: v.id }).eq('id', v.entry_id)
          )
        );
        console.log(`✅ Logged ${insertedVerifs.length} client-attested (offline) verifications.`);
      }
    }

    // Backward-compat link: point each consumed server-side verification at the
    // first entry of this request (entries already reference it via
    // timesheet_entries.verification_id).
    if (validVerificationIds.size > 0) {
      await supabase
        .from('timesheet_entry_verifications')
        .update({ entry_id: insertedEntries[0].id })
        .in('id', [...validVerificationIds])
        .is('entry_id', null);
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
          entries: insertedEntries.map(e => ({ id: e.id, data: e.data, environment_id: e.environment_id, verification_id: e.verification_id }))
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
          verification_id: insertedEntries[0].verification_id,
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

