/**
 * Entrega de folhas de ponto ao Departamento Pessoal (DP) do cliente.
 *
 * O alvo de entrega é configuração por tenant — NÃO existe bucket padrão:
 *   tenants.settings.dp_delivery = { "bucket": "<storage-bucket>", "webhook_url": "<opcional>" }
 * Sem essa config o recurso fica desligado (nada é gravado na fila).
 *
 * Fluxo: timesheet aprovado -> PDF individual (gerador de relatorios
 * detalhado existente) -> upload no bucket privado configurado sob
 * dp/{centro_custo}/{AAAA-MM}/{colaborador}.pdf -> registro em
 * dp_deliveries (vinculo colaborador <-> centro de custo <-> arquivo).
 * Reaproveita a mesma chamada em re-aprovacao (upsert idempotente).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateDetailedReport, type ReportFilters, type TimesheetBasic } from '@/lib/reports/generator';
import { generateReportPDF } from '@/lib/reports/pdf-generator';

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
  /** 'desabilitado' quando o tenant não configurou settings.dp_delivery. */
  status: DpDeliveryStatus | 'desabilitado';
  storagePath?: string;
  error?: string;
}

export interface DpDeliveryConfig {
  bucket: string;
  webhookUrl?: string;
}

/**
 * Lê o alvo de entrega de DP do tenant (tenants.settings.dp_delivery).
 * Retorna null quando o recurso não está configurado para o tenant.
 */
export async function resolveDpDeliveryConfig(
  sb: SupabaseClient,
  tenantId: string
): Promise<DpDeliveryConfig | null> {
  const { data: tenant } = await sb
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .maybeSingle();
  const raw = tenant?.settings?.dp_delivery as { bucket?: unknown; webhook_url?: unknown } | undefined;
  if (!raw || typeof raw.bucket !== 'string' || raw.bucket.trim() === '') return null;
  return {
    bucket: raw.bucket.trim(),
    webhookUrl: typeof raw.webhook_url === 'string' && raw.webhook_url.trim() !== '' ? raw.webhook_url.trim() : undefined,
  };
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
export async function ensureDpBucket(sb: SupabaseClient, bucket: string): Promise<void> {
  const { error } = await sb.storage.createBucket(bucket, { public: false });
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
 * Gera o PDF da folha, sobe para o Storage configurado pelo tenant e registra na fila.
 * Nunca lanca: falha vira registro 'pendente' com last_error para reprocesso.
 * Tenant sem settings.dp_delivery -> recurso desligado, nada é gravado.
 */
export async function fileTimesheetForDp(sb: SupabaseClient, timesheetId: string): Promise<DpFileResult> {
  const ts = await loadDpTimesheet(sb, timesheetId);
  const config = await resolveDpDeliveryConfig(sb, ts.tenant_id);
  if (!config) {
    return { ok: true, status: 'desabilitado' };
  }
  const centroCusto = ts.employee?.centro_custo || 'sem-cc';

  const baseRow = {
    tenant_id: ts.tenant_id,
    timesheet_id: ts.id,
    employee_id: ts.employee_id,
    centro_custo: centroCusto,
    periodo_ini: ts.periodo_ini,
    periodo_fim: ts.periodo_fim,
    storage_bucket: config.bucket,
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

    await ensureDpBucket(sb, config.bucket);
    const { error: upErr } = await sb.storage
      .from(config.bucket)
      .upload(storagePath, pdf, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    const { error: dbErr } = await sb.from('dp_deliveries').upsert(
      { ...baseRow, storage_path: storagePath, status: 'entregue', last_error: null, updated_at: new Date().toISOString() },
      { onConflict: 'timesheet_id' }
    );
    if (dbErr) throw dbErr;

    if (config.webhookUrl) {
      // Notificacao best-effort do webhook configurado pelo tenant.
      try {
        await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'dp.timesheet_filed',
            tenantId: ts.tenant_id,
            timesheetId: ts.id,
            employeeId: ts.employee_id,
            centroCusto,
            periodoIni: ts.periodo_ini,
            periodoFim: ts.periodo_fim,
            bucket: config.bucket,
            storagePath,
          }),
        });
      } catch (webhookErr) {
        console.warn('[DP] Webhook de entrega falhou (entrega no storage concluida):', webhookErr);
      }
    }

    return { ok: true, status: 'entregue', storagePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markPending(message).catch(() => {});
    return { ok: false, status: 'pendente', storagePath, error: message };
  }
}
