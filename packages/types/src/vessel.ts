/**
 * Vessel types
 */

export interface Vessel {
  id: string;
  tenant_id: string;
  name: string;
  code?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

