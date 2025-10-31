/**
 * Shared Types for Mobile and Web Applications
 * These types are used across all platforms (web, mobile, backend)
 */

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN_GLOBAL' | 'TENANT_ADMIN' | 'GERENTE' | 'COLAB';
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// ============================================================================
// Timesheet
// ============================================================================

export interface TimesheetEntry {
  id: string;
  timesheetId: string;
  date: string;
  type: 'embarque' | 'desembarque' | 'translado';
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'bloqueado';
  entries: TimesheetEntry[];
  annotations: TimesheetAnnotation[];
  approvals: TimesheetApproval[];
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetAnnotation {
  id: string;
  timesheetId: string;
  managerId: string;
  field?: string;
  entryId?: string;
  message: string;
  createdAt: string;
}

export interface TimesheetApproval {
  id: string;
  timesheetId: string;
  managerId: string;
  status: 'aprovado' | 'recusado';
  reason?: string;
  createdAt: string;
}

// ============================================================================
// Employee
// ============================================================================

export interface Employee {
  id: string;
  tenantId: string;
  displayName: string;
  email: string;
  hourlyRate: number;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Manager
// ============================================================================

export interface Manager {
  id: string;
  tenantId: string;
  displayName: string;
  email: string;
  groupIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ManagerGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  employeeIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Tenant
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Reports
// ============================================================================

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  employeeId?: string;
}

export interface SummaryReport {
  totalTimesheets: number;
  approved: number;
  rejected: number;
  pending: number;
  draft: number;
  locked: number;
  generatedAt: string;
}

export interface DetailedReport {
  timesheets: Timesheet[];
  totalCount: number;
  generatedAt: string;
}

// ============================================================================
// Invoice
// ============================================================================

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  deadlineReminders: boolean;
  approvalNotifications: boolean;
  rejectionNotifications: boolean;
}

export interface PushNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentAt: string;
  readAt?: string;
}

// ============================================================================
// API Responses
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// Error Handling
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

