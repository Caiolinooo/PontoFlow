import type { SupabaseClient } from '@supabase/supabase-js';
import type { ISODate, RubricLine, TimesheetSummary } from './types';

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

function eachIsoDate(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime()) || cursor > last) return out;
  while (cursor <= last) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

function isWeekday(iso: string): boolean {
  const day = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

/** Minutos do intervalo que caem em 22:00–05:00. Intervalo pode virar o dia. */
export function nightMinutes(horaIni: string, horaFim: string): number {
  const [sh, sm] = horaIni.split(':').map(Number);
  const [eh, em] = horaFim.split(':').map(Number);
  let start = sh * 60 + (sm || 0);
  let end = eh * 60 + (em || 0);
  if (end <= start) end += 24 * 60;
  let total = 0;
  for (let m = start; m < end; m += 1) {
    const clock = m % (24 * 60);
    if (clock >= 22 * 60 || clock < 5 * 60) total += 1;
  }
  return total;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Linhas de rubrica já calculadas no PontoFlow.
 * DIAS, HORAS, HE50 (excesso de 8h no dia), NOTURNO.
 * FALTA só em escala semanal (seg–sex sem apontamento). Offshore não inventa falta.
 */
export function rubricLinesFromEntries(
  entries: EntryRow[],
  opts: { periodStart: string; periodEnd: string; weekly: boolean },
): RubricLine[] {
  const summary = summarizeEntries(entries);
  const byDate: Record<string, EntryRow[]> = {};
  for (const e of entries) {
    if (!e.data) continue;
    (byDate[e.data] ??= []).push(e);
  }

  let extraMinutes = 0;
  let night = 0;
  for (const dayEntries of Object.values(byDate)) {
    let dayMinutes = 0;
    for (const e of dayEntries) {
      if (!e.hora_ini || !e.hora_fim) continue;
      const start = timeToMinutes(e.hora_ini);
      let end = timeToMinutes(e.hora_fim);
      if (end <= start) end += 24 * 60;
      dayMinutes += end - start;
      night += nightMinutes(e.hora_ini, e.hora_fim);
    }
    if (dayMinutes > 8 * 60) extraMinutes += dayMinutes - 8 * 60;
  }

  const lines: RubricLine[] = [
    { code: 'DIAS', quantity: summary.workedDays },
    { code: 'HORAS', quantity: round2(summary.workedMinutes / 60) },
    { code: 'HE50', quantity: round2(extraMinutes / 60) },
    { code: 'NOTURNO', quantity: round2(night / 60) },
  ];

  if (opts.weekly) {
    const expected = eachIsoDate(opts.periodStart, opts.periodEnd).filter(isWeekday);
    const worked = new Set(Object.keys(byDate));
    const falta = expected.filter((d) => !worked.has(d)).length;
    lines.push({ code: 'FALTA', quantity: falta });
  }
  return lines;
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

/** workedDays/workedMinutes + lines para o evento timesheet.approved. */
export async function approvedMetrics(
  supabase: SupabaseClient,
  timesheetId: string,
  employeeId: string,
): Promise<{ workedDays: number; workedMinutes: number; lines: RubricLine[] }> {
  const { data: sheet } = await supabase
    .from('timesheets')
    .select('periodo_ini, periodo_fim')
    .eq('id', timesheetId)
    .maybeSingle();
  const { data: entries } = await supabase
    .from('timesheet_entries')
    .select('data, hora_ini, hora_fim')
    .eq('timesheet_id', timesheetId);
  const rows = (entries ?? []) as EntryRow[];
  const summary = summarizeEntries(rows);

  const { data: schedule } = await supabase
    .from('employee_work_schedules')
    .select('notes')
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  const notes = typeof schedule?.notes === 'string' ? schedule.notes : '';
  const weekly = notes.includes('"kind":"weekly"');

  return {
    ...summary,
    lines: rubricLinesFromEntries(rows, {
      periodStart: (sheet?.periodo_ini as string) || '',
      periodEnd: (sheet?.periodo_fim as string) || '',
      weekly,
    }),
  };
}
