/**
 * Timesheet types
 */

import { TimesheetStatus, EntryType } from './enums';

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  entry_date: string; // YYYY-MM-DD
  tipo: EntryType;
  hora_ini?: string | null; // HH:MM
  hora_fim?: string | null; // HH:MM
  observacao?: string | null;
  hours_regular?: number;
  hours_overtime?: number;
  created_at: string;
  updated_at: string;
}

export interface Timesheet {
  id: string;
  employee_id: string;
  tenant_id: string;
  periodo_ini: string; // YYYY-MM-DD
  periodo_fim: string; // YYYY-MM-DD
  status: TimesheetStatus;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Relations (optional, populated by joins)
  entries?: TimesheetEntry[];
  employee?: {
    id: string;
    display_name: string;
    full_name?: string;
    email?: string;
  };
  vessel?: {
    id: string;
    name: string;
  };
}

export interface TimesheetAnnotation {
  id: string;
  timesheet_id: string;
  entry_id?: string | null;
  field_name?: string | null;
  comment: string;
  annotated_by: string;
  created_at: string;
}

export interface TimesheetSummary {
  id: string;
  employee_name: string;
  period_start: string;
  period_end: string;
  status: TimesheetStatus;
  entry_count: number;
  total_hours: number;
  submitted_at?: string | null;
}

