/**
 * Entrega de folhas de ponto ao Departamento Pessoal (Portal ABZ).
 *
 * Fluxo: timesheet aprovado -> PDF individual (gerador de relatorios
 * detalhado existente) -> upload no bucket privado 'dp-folhas' sob
 * dp/{centro_custo}/{AAAA-MM}/{colaborador}.pdf -> registro em
 * dp_deliveries (vinculo colaborador <-> centro de custo <-> arquivo).
 * Reaproveita a mesma chamada em re-aprovacao (upsert idempotente).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateDetailedReport, type ReportFilters, type TimesheetBasic } from '@/lib/reports/generator';
import { generateReportPDF } from '@/lib/reports/pdf-generator';

export const DP_BUCKET = 'dp-folhas';

export type DpDeliveryStatus = 'pendente' | 'entregue';

export interface DpTimesheet {
  id: string;
  tenant_id: string;
  employee_id: string;
  periodo_ini: string;
  periodo_fim: string;
  employee: { display_name: string | null; centro_custo: string | null } | null;
  entries: TimesheetBasic['entries'];
  annotations: TimesheetBasic['annotations'];
}

export interface DpFileResult {
  ok: boolean;
  status: DpDeliveryStatus;
  storagePath?: string;
  error?: string;
}

/** Remove acentos, espacos e caracteres inseguros para uso em path de Storage. */
export function sanitizePathSegment(raw: string): string {
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9\-_ ]/g, '')
    .replace(/\s+/g, '-');
  return cleaned || 'sem-nome';
}

/** dp/{cc}/{AAAA-MM}/{employeeId}-{nome}.pdf - deterministico por periodo/colaborador. */
export function buildDpStoragePath(input: {
  centroCusto: string;
  periodoIni: string;
  employeeId: string;
  employeeName?: string | null;
}): string {
  const cc = sanitizePathSegment(input.centroCusto);
  const mes = input.periodoIni.slice(0, 7);
  const nome = input.employeeName ? `-${sanitizePathSegment(input.employeeName)}` : '';
  return `dp/${cc}/${mes}/${input.employeeId}${nome}.pdf`;
}

/** Cria o bucket privado se ainda nao existir (idempotente). */
export async function ensureDpBucket(sb: SupabaseClient): Promise<void> {
  const { error } = await sb.storage.createBucket(DP_BUCKET, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

export async function loadDpTimesheet(sb: SupabaseClient, timesheetId: string): Promise<DpTimesheet> {
  const { data, error } = await sb
    .from('timesheets')
    .select(`
      id, tenant_id, employee_id, periodo_ini, periodo_fim,
      employee:employees(display_name, centro_custo),
      entries:timesheet_entries(id, data, tipo, hora_ini, hora_fim, observacao),
      annotations:timesheet_annotations(id, entry_id, field_path, message)
    `)
    .eq('id', timesheetId)
    .single();
  if (error || !data) throw new Error(error?.message ?? 'timesheet_not_found');
  return data as unknown as DpTimesheet;
}

/**
 * Gera o PDF da folha, sobe para o Storage e registra na fila.
 * Nunca lanca: falha vira registro 'pendente' com last_error para reprocesso.
 */
export async function fileTimesheetForDp(sb: SupabaseClient, timesheetId: string): Promise<DpFileResult> {
  const ts = await loadDpTimesheet(sb, timesheetId);
  const centroCusto = ts.employee?.centro_custo || 'sem-cc';

  const baseRow = {
    tenant_id: ts.tenant_id,
    timesheet_id: ts.id,
    employee_id: ts.employee_id,
    centro_custo: centroCusto,
    periodo_ini: ts.periodo_ini,
    periodo_fim: ts.periodo_fim,
  };
  const storagePath = buildDpStoragePath({
    centroCusto,
    periodoIni: ts.periodo_ini,
    employeeId: ts.employee_id,
    employeeName: ts.employee?.display_name,
  });

  const markPending = async (message: string) => {
    await sb.from('dp_deliveries').upsert(
      { ...baseRow, storage_path: storagePath, status: 'pendente', last_error: message, updated_at: new Date().toISOString() },
      { onConflict: 'timesheet_id' }
    );
  };

  try {
    const filters: ReportFilters = { startDate: ts.periodo_ini, endDate: ts.periodo_fim, employeeId: ts.employee_id };
    const report = generateDetailedReport([ts as unknown as TimesheetBasic], filters);
    const pdf = await generateReportPDF(report, {
      employeeName: ts.employee?.display_name ?? undefined,
      employeeId: ts.employee_id,
      locale: 'pt-BR',
    });

    await ensureDpBucket(sb);
    const { error: upErr } = await sb.storage
      .from(DP_BUCKET)
      .upload(storagePath, pdf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    const { error: dbErr } = await sb.from('dp_deliveries').upsert(
      { ...baseRow, storage_path: storagePath, status: 'entregue', last_error: null, updated_at: new Date().toISOString() },
      { onConflict: 'timesheet_id' }
    );
    if (dbErr) throw dbErr;

    return { ok: true, status: 'entregue', storagePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markPending(message).catch(() => {});
    return { ok: false, status: 'pendente', storagePath, error: message };
  }
}
