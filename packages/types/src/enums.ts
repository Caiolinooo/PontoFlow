/**
 * Enums and constants
 */

export enum TimesheetStatus {
  DRAFT = 'rascunho',
  SUBMITTED = 'enviado',
  APPROVED = 'aprovado',
  REJECTED = 'recusado',
}

export enum EntryType {
  BOARDING = 'embarque',
  DISEMBARKING = 'desembarque',
  TRANSFER = 'translado',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum UserRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationEvent {
  TIMESHEET_SUBMITTED = 'timesheet_submitted',
  TIMESHEET_APPROVED = 'timesheet_approved',
  TIMESHEET_REJECTED = 'timesheet_rejected',
  DEADLINE_REMINDER = 'deadline_reminder',
  ANNOTATION_ADDED = 'annotation_added',
}

export const TIMESHEET_STATUSES = Object.values(TimesheetStatus);
export const ENTRY_TYPES = Object.values(EntryType);
export const APPROVAL_STATUSES = Object.values(ApprovalStatus);
export const USER_ROLES = Object.values(UserRole);
export const NOTIFICATION_TYPES = Object.values(NotificationType);
export const NOTIFICATION_EVENTS = Object.values(NotificationEvent);

