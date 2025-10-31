/**
 * Data Transfer Objects (DTOs)
 * 
 * Request and response types for API communication
 */

import { TimesheetStatus, EntryType, ApprovalStatus } from './enums';

// ============================================================================
// Authentication DTOs
// ============================================================================

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  user: {
    id: string;
    email: string;
    role: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

// ============================================================================
// Timesheet DTOs
// ============================================================================

export interface CreateTimesheetEntryRequest {
  data: string; // YYYY-MM-DD
  tipo: EntryType;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
}

export interface UpdateTimesheetEntryRequest {
  data?: string;
  tipo?: EntryType;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
}

export interface SubmitTimesheetRequest {
  timesheet_id: string;
}

export interface SubmitTimesheetResponse {
  success: boolean;
  timesheet_id: string;
  submitted_at: string;
}

// ============================================================================
// Manager DTOs
// ============================================================================

export interface ApproveTimesheetRequest {
  timesheet_id: string;
  message?: string;
}

export interface RejectTimesheetRequest {
  timesheet_id: string;
  message: string;
  annotations?: Array<{
    entry_id?: string;
    field_name?: string;
    comment: string;
  }>;
}

export interface AddAnnotationRequest {
  timesheet_id: string;
  entry_id?: string;
  field_name?: string;
  comment: string;
}

export interface PendingTimesheetsResponse {
  items: Array<{
    id: string;
    employee_name: string;
    period_start: string;
    period_end: string;
    status: TimesheetStatus;
    entry_count: number;
    submitted_at: string;
  }>;
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// Report DTOs
// ============================================================================

export interface GenerateReportRequest {
  type: 'summary' | 'detailed';
  start_date?: string;
  end_date?: string;
  status?: TimesheetStatus;
  employee_id?: string;
  group_id?: string;
}

export interface SummaryReportResponse {
  type: 'summary';
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_timesheets: number;
    total_entries: number;
    total_hours: number;
    by_status: Record<TimesheetStatus, number>;
  };
  employees: Array<{
    employee_id: string;
    employee_name: string;
    timesheet_count: number;
    total_hours: number;
  }>;
}

export interface DetailedReportResponse {
  type: 'detailed';
  period: {
    start: string;
    end: string;
  };
  timesheets: Array<{
    id: string;
    employee_name: string;
    period_start: string;
    period_end: string;
    status: TimesheetStatus;
    entries: Array<{
      date: string;
      type: EntryType;
      hours: number;
      notes?: string;
    }>;
    total_hours: number;
  }>;
}

// ============================================================================
// Export DTOs
// ============================================================================

export interface ExportRequest {
  format: 'json' | 'csv' | 'pdf';
  start_date?: string;
  end_date?: string;
  employee_ids?: string[];
}

export interface ExportResponse {
  format: string;
  filename: string;
  data: string | Buffer;
  generated_at: string;
}

// ============================================================================
// Invoice DTOs
// ============================================================================

export interface GenerateInvoiceRequest {
  timesheet_id: string;
  format?: 'json' | 'csv' | 'pdf';
  rate_type?: 'daily' | 'hourly';
  rate_value?: number;
  currency?: 'USD' | 'BRL' | 'GBP';
  cost_center?: string;
  call_off?: string;
  notes?: string;
}

export interface InvoiceResponse {
  tenant_id: string;
  environment_slug: string;
  employee: {
    name: string;
    id: string;
    position: string;
  };
  vessel: {
    name: string;
  };
  period: {
    start: string;
    end: string;
  };
  work: {
    day_count: number;
    hours_regular: number;
    hours_overtime: number;
  };
  rate: {
    type: 'daily' | 'hourly';
    value: number;
    currency: string;
  };
  total_amount: number;
  notes?: string;
}

// ============================================================================
// Notification DTOs
// ============================================================================

export interface UpdateNotificationPreferencesRequest {
  email_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
  events?: {
    [key: string]: boolean;
  };
}

export interface SubscribePushRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SendPushNotificationRequest {
  user_id: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}

// ============================================================================
// Admin DTOs
// ============================================================================

export interface CreateTenantRequest {
  name: string;
  slug: string;
  settings?: Record<string, any>;
}

export interface UpdateTenantRequest {
  name?: string;
  active?: boolean;
  settings?: Record<string, any>;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
  tenant_id?: string;
}

export interface UpdateUserRequest {
  email?: string;
  role?: string;
  active?: boolean;
}

// ============================================================================
// Pagination DTOs
// ============================================================================

export interface PaginationRequest {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// Error DTOs
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  errors: ValidationError[];
}

