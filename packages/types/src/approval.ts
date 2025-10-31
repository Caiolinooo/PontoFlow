/**
 * Approval types
 */

import { ApprovalStatus } from './enums';

export interface Approval {
  id: string;
  timesheet_id: string;
  approved_by: string;
  status: ApprovalStatus;
  message?: string | null;
  created_at: string;
}

export interface ApprovalHistory {
  timesheet_id: string;
  approvals: Approval[];
  annotations: Array<{
    id: string;
    field_name?: string | null;
    comment: string;
    annotated_by: string;
    created_at: string;
  }>;
}

