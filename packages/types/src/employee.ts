/**
 * Employee types
 */

import { UserRole } from './enums';

export interface Employee {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  display_name: string;
  full_name?: string | null;
  email?: string | null;
  position?: string | null;
  vessel_id?: string | null;
  hourly_rate?: number | null;
  daily_rate?: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenant_id?: string | null;
  locale?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeProfile {
  employee: Employee;
  user?: User;
  vessel?: {
    id: string;
    name: string;
  };
}

