/**
 * Tenant types
 */

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  deadline_day?: number;
  default_locale?: string;
  email_notifications_enabled?: boolean;
  push_notifications_enabled?: boolean;
  auto_approve_enabled?: boolean;
}

