/**
 * Uma função grava a batida. Portal (API key) e ponto.groupabz.com (sessão)
 * chamam recordPunch. externalId é gt_colaboradores.id.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PunchKind, PunchSource } from './types';

export class PunchError extends Error {
  readonly code: 'not_found' | 'employee_inactive' | 'no_open_punch' | 'period_locked' | 'invalid_at';
  readonly status: number;

  constructor(
    code: PunchError['code'],
    message: string,
    status: number,
  ) {
    super(message);
    this.name = 'PunchError';
    this.code = code;
    this.status = status;
  }
}

export interface PunchInput {
  externalId: string;
  kind: PunchKind;
  at: string;
  source: PunchSource;
  geo?: { lat: number; lng: number } | null;
}

export interface PunchRecord {
  employeeId: string;
  externalId: string;
  timesheetId: string;
  entryId: string;
  date: string;
  kind: PunchKind;
  horaIni: string | null;
  horaFim: string | null;
}

export interface TodayPunch {
  date: string;
  open: boolean;
  horaIni: string | null;
  horaFim: string | null;
}

const TZ = 'America/Sao_Paulo';

export function zonedClock(iso: string, timeZone = TZ): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new PunchError('invalid_at', 'at is not a valid datetime', 400);
  }
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function monthBounds(date: string): { start: string; end: string } {
  const [y, m] = date.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, '0');
  return { start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

function noteFor(source: PunchSource, geo?: { lat: number; lng: number } | null): string {
  const geoBit = geo ? ` lat=${geo.lat} lng=${geo.lng}` : '';
  return `source=${source}${geoBit}`.slice(0, 1000);
}

interface EntryRow {
  id: string;
  hora_ini: string | null;
  hora_fim: string | null;
}

async function loadEmployee(supabase: SupabaseClient, tenantId: string, externalId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('id, active, deactivated_at')
    .eq('tenant_id', tenantId)
    .eq('external_id', externalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new PunchError('not_found', 'Person not found', 404);
  if (data.active === false || data.deactivated_at) {
    throw new PunchError('employee_inactive', 'Person is inactive', 409);
  }
  return data as { id: string; active: boolean | null; deactivated_at: string | null };
}

async function ensureTimesheet(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  date: string,
): Promise<string> {
  const { data: covering } = await supabase
    .from('timesheets')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .lte('periodo_ini', date)
    .gte('periodo_fim', date)
    .order('periodo_ini', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (covering) {
    if (covering.status === 'aprovado' || covering.status === 'bloqueado') {
      throw new PunchError('period_locked', 'Timesheet period is locked', 409);
    }
    return covering.id as string;
  }

  const bounds = monthBounds(date);
  const { data: created, error } = await supabase
    .from('timesheets')
    .insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      periodo_ini: bounds.start,
      periodo_fim: bounds.end,
      status: 'rascunho',
    })
    .select('id')
    .single();
  if (error || !created) throw new Error(error?.message || 'failed to create timesheet');
  return created.id as string;
}

async function defaultEnvironmentId(supabase: SupabaseClient, tenantId: string): Promise<string | null> {
  const { data } = await supabase
    .from('environments')
    .select('id, slug')
    .eq('tenant_id', tenantId)
    .order('name')
    .limit(20);
  const rows = (data || []) as { id: string; slug: string | null }[];
  const work = rows.find((r) => (r.slug || '').toLowerCase() !== 'folga');
  return (work || rows[0])?.id ?? null;
}

async function dayEntries(
  supabase: SupabaseClient,
  timesheetId: string,
  date: string,
): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from('timesheet_entries')
    .select('id, hora_ini, hora_fim')
    .eq('timesheet_id', timesheetId)
    .eq('data', date)
    .order('hora_ini', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as EntryRow[];
}

function toRecord(
  employeeId: string,
  externalId: string,
  timesheetId: string,
  entry: EntryRow,
  date: string,
  kind: PunchKind,
): PunchRecord {
  return {
    employeeId,
    externalId,
    timesheetId,
    entryId: entry.id,
    date,
    kind,
    horaIni: entry.hora_ini,
    horaFim: entry.hora_fim,
  };
}

export async function recordPunch(
  supabase: SupabaseClient,
  tenantId: string,
  input: PunchInput,
): Promise<PunchRecord> {
  const { date, time } = zonedClock(input.at);
  const employee = await loadEmployee(supabase, tenantId, input.externalId);
  const timesheetId = await ensureTimesheet(supabase, tenantId, employee.id, date);
  const entries = await dayEntries(supabase, timesheetId, date);
  const open = [...entries].reverse().find((e) => e.hora_ini && !e.hora_fim);

  if (input.kind === 'in') {
    if (open) return toRecord(employee.id, input.externalId, timesheetId, open, date, 'in');
    const environmentId = await defaultEnvironmentId(supabase, tenantId);
    const { data, error } = await supabase
      .from('timesheet_entries')
      .insert({
        tenant_id: tenantId,
        timesheet_id: timesheetId,
        data: date,
        tipo: 'normal',
        environment_id: environmentId,
        hora_ini: time,
        hora_fim: null,
        observacao: noteFor(input.source, input.geo),
      })
      .select('id, hora_ini, hora_fim')
      .single();
    if (error || !data) throw new Error(error?.message || 'failed to insert punch');
    return toRecord(employee.id, input.externalId, timesheetId, data as EntryRow, date, 'in');
  }

  if (!open) throw new PunchError('no_open_punch', 'No open punch to close', 409);
  const { data, error } = await supabase
    .from('timesheet_entries')
    .update({ hora_fim: time, observacao: noteFor(input.source, input.geo) })
    .eq('id', open.id)
    .select('id, hora_ini, hora_fim')
    .single();
  if (error || !data) throw new Error(error?.message || 'failed to close punch');
  return toRecord(employee.id, input.externalId, timesheetId, data as EntryRow, date, 'out');
}

export async function todayPunch(
  supabase: SupabaseClient,
  tenantId: string,
  externalId: string,
  at = new Date().toISOString(),
): Promise<TodayPunch> {
  const { date } = zonedClock(at);
  const employee = await loadEmployee(supabase, tenantId, externalId);
  const { data: covering } = await supabase
    .from('timesheets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employee.id)
    .lte('periodo_ini', date)
    .gte('periodo_fim', date)
    .order('periodo_ini', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!covering) return { date, open: false, horaIni: null, horaFim: null };
  const entries = await dayEntries(supabase, covering.id as string, date);
  const last = entries[entries.length - 1];
  if (!last) return { date, open: false, horaIni: null, horaFim: null };
  return {
    date,
    open: Boolean(last.hora_ini && !last.hora_fim),
    horaIni: last.hora_ini,
    horaFim: last.hora_fim,
  };
}
