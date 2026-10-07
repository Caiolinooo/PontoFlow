/**
 * Integration API v1 — contrato público (PLANO-IMPLEMENTACAO.md §5, §8).
 * Estes tipos são a superfície estável da API; mudanças breaking => /v2.
 */

export type ISODate = string; // YYYY-MM-DD

export type WorkSchedule =
  | { kind: 'pattern'; daysOn: number; daysOff: number; anchor: ISODate } // 14x14, 28x28…
  | { kind: 'weekly'; workdays: (1 | 2 | 3 | 4 | 5 | 6 | 7)[] }; // onshore 5x2 (1=seg … 7=dom)

export interface PersonUpsert {
  externalId: string; // obrigatório, único por tenant
  email: string;
  displayName: string;
  cpf?: string; // 11 dígitos; só reconciliação/dedup
  active: boolean;
  schedule?: WorkSchedule; // ausente => default do tenant
  managerExternalId?: string; // v1.1 (aceito e ignorado em v1)
  attributes?: Record<string, string>; // livre (empresa, embarcação…) — opaco ao TS
}

export interface PersonResult {
  employeeId: string | null; // null em tenant 'password' enquanto convite pendente
  externalId: string;
  state: 'invited' | 'active' | 'inactive';
  created: boolean;
}

export type IntegrationEventType =
  | 'person.provisioned'
  | 'person.deactivated'
  | 'timesheet.submitted'
  | 'timesheet.approved'
  | 'timesheet.rejected'
  | 'period.locked';

export type IntegrationEvent =
  | { id: string; type: 'person.provisioned' | 'person.deactivated'; externalId: string; at: string }
  | {
      id: string;
      type: 'timesheet.submitted' | 'timesheet.rejected';
      externalId: string;
      timesheetId: string;
      periodStart: ISODate;
      periodEnd: ISODate;
      at: string;
    }
  | {
      id: string;
      type: 'timesheet.approved';
      externalId: string;
      timesheetId: string;
      periodStart: ISODate;
      periodEnd: ISODate;
      workedDays: number;
      workedMinutes: number;
      lines: RubricLine[];
      at: string;
    }
  | { id: string; type: 'period.locked'; periodMonth: ISODate; at: string };

// Omit distributivo: sem ele, Omit<união,'id'> colapsa para as chaves comuns
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Evento sem `id` (o id é gerado na emissão e vira o id da linha de outbox). */
export type IntegrationEventInput = DistributiveOmit<IntegrationEvent, 'id'>;

export interface RubricLine {
  code: string;
  quantity: number;
}

export type PunchKind = 'in' | 'out';
export type PunchSource = 'portal' | 'web';

export interface TimesheetSummary {
  timesheetId: string;
  externalId: string;
  periodStart: ISODate;
  periodEnd: ISODate;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'bloqueado';
  workedDays: number;
  workedMinutes: number;
}

// ===== Auth interna da API =====

export type IntegrationScope =
  | 'people:write'
  | 'timesheets:read'
  | 'sso:create'
  | 'webhooks:manage'
  | 'punches:write';

export interface ApiKeyAuth {
  keyId: string;
  tenantId: string;
  scopes: string[];
}

// ===== Erros =====

export type IntegrationErrorCode =
  | 'unauthorized'
  | 'forbidden_scope'
  | 'forbidden_ip'
  | 'invalid_body'
  | 'idempotency_key_required'
  | 'idempotency_conflict'
  | 'not_found'
  | 'email_conflict'
  | 'cpf_conflict'
  | 'external_id_conflict'
  | 'employee_inactive'
  | 'no_open_punch'
  | 'period_locked'
  | 'invalid_at'
  | 'tenant_not_found'
  | 'no_inviter'
  | 'internal_error';

export interface IntegrationErrorBody {
  error: { code: IntegrationErrorCode; message: string; details?: unknown };
}
