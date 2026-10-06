import type { SupabaseClient } from '@supabase/supabase-js';
import type { ISODate, TimesheetSummary } from './types';

interface EntryRow {
  data: string | null;
  hora_ini: string | null;
  hora_fim: string | null;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Resumo derivado por timesheet: workedDays = datas distintas com apontamento;
 * workedMinutes = soma dos intervalos completos do dia (hora_ini→hora_fim, com
 * virada de dia); dia sem intervalo completo usa amplitude (máx − mín das horas).
 * Puro e determinístico — mesma regra no GET /timesheets e no evento timesheet.approved.
 */
export function summarizeEntries(entries: EntryRow[]): { workedDays: number; workedMinutes: number } {
  const byDate: Record<string, EntryRow[]> = {};
  for (const e of entries) {
    if (!e.data) continue;
    (byDate[e.data] ??= []).push(e);
  }

  let workedMinutes = 0;
  for (const dayEntries of Object.values(byDate)) {
    let dayMinutes = 0;
    const singles: number[] = [];
    for (const e of dayEntries) {
      if (e.hora_ini && e.hora_fim) {
        const start = timeToMinutes(e.hora_ini);
        let end = timeToMinutes(e.hora_fim);
        if (end <= start) end += 24 * 60; // turno que vira o dia
        dayMinutes += end - start;
      } else if (e.hora_ini) {
        singles.push(timeToMinutes(e.hora_ini));
      }
    }
    if (dayMinutes === 0 && singles.length > 0) {
      dayMinutes = Math.max(...singles) - Math.min(...singles);
    }
    workedMinutes += dayMinutes;
  }

  return { workedDays: Object.keys(byDate).length, workedMinutes };
}

/** Resumo de um timesheet específico (usado no hook de approve). */
export async function summarizeTimesheet(
  supabase: SupabaseClient,
  timesheetId: string
): Promise<{ workedDays: number; workedMinutes: number }> {
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('data, hora_ini, hora_fim')
    .eq('timesheet_id', timesheetId);
  return summarizeEntries((entries ?? []) as EntryRow[]);
}

/**
 * GET /timesheets: timesheets do externalId que intersectam [from, to],
 * com resumo derivado por período. Somente leitura.
 */
export async function listTimesheetSummaries(
  supabase: SupabaseClient,
  tenantId: string,
  externalId: string,
  from: ISODate,
  to: ISODate
): Promise<TimesheetSummary[] | null> {
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('external_id', externalId)
    .maybeSingle();
  if (!employee) return null;

  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select('id, periodo_ini, periodo_fim, status')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employee.id)
    .lte('periodo_ini', to)
    .gte('periodo_fim', from)
    .order('periodo_ini', { ascending: true });
  if (error) {
    console.error('[integration/v1] timesheets query failed:', error.message);
    return [];
  }
  if (!timesheets || timesheets.length === 0) return [];

  const ids = timesheets.map((t) => t.id as string);
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('timesheet_id, data, hora_ini, hora_fim')
    .in('timesheet_id', ids);

  const entriesBySheet: Record<string, EntryRow[]> = {};
  for (const e of (entries ?? []) as (EntryRow & { timesheet_id: string })[]) {
    (entriesBySheet[e.timesheet_id] ??= []).push(e);
  }

  return timesheets.map((t) => {
    const summary = summarizeEntries(entriesBySheet[t.id as string] ?? []);
    return {
      timesheetId: t.id as string,
      externalId,
      periodStart: t.periodo_ini as string,
      periodEnd: t.periodo_fim as string,
      status: t.status as TimesheetSummary['status'],
      ...summary,
    };
  });
}
