/**
 * Database Validation Types
 * 
 * Tipos TypeScript para sistema de validação automática de banco de dados
 * Timesheet Manager - ABZ Group
 */

import { Database } from '@supabase/supabase-js';

// ===============================
// TIPOS BÁSICOS
// ===============================

export type TableStatus = 'valid' | 'missing' | 'incomplete' | 'invalid';

export type IndexStatus = 'valid' | 'missing' | 'invalid';

export type PolicyStatus = 'valid' | 'missing' | 'invalid';

export type FunctionStatus = 'valid' | 'missing' | 'invalid';

export type MigrationStatus = 'pending' | 'executed' | 'failed';

// ===============================
// INTERFACES DE VALIDAÇÃO
// ===============================

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  checkConstraint?: string;
}

export interface TableValidation {
  name: string;
  status: TableStatus;
  exists: boolean;
  columns: ColumnDefinition[];
  missingColumns: ColumnDefinition[];
  extraColumns: string[];
  missingConstraints: string[];
  missingIndexes: string[];
  missingPolicies: string[];
  issues: string[];
  lastChecked: Date;
}

export interface IndexValidation {
  name: string;
  tableName: string;
  columns: string[];
  status: IndexStatus;
  exists: boolean;
  isUnique: boolean;
  isValid: boolean;
  lastChecked: Date;
}

export interface PolicyValidation {
  name: string;
  tableName: string;
  status: PolicyStatus;
  exists: boolean;
  command: string;
  using: string;
  withCheck: string;
  lastChecked: Date;
}

export interface FunctionValidation {
  name: string;
  status: FunctionStatus;
  exists: boolean;
  signature: string;
  returnType: string;
  lastChecked: Date;
}

export interface MigrationValidation {
  name: string;
  status: MigrationStatus;
  executedAt?: Date;
  executedBy?: string;
  lastChecked: Date;
}

// ===============================
// RELATÓRIO DE VALIDAÇÃO
// ===============================

export interface ValidationSummary {
  totalTables: number;
  validTables: number;
  missingTables: number;
  incompleteTables: number;
  totalIndexes: number;
  validIndexes: number;
  missingIndexes: number;
  totalPolicies: number;
  validPolicies: number;
  missingPolicies: number;
  totalFunctions: number;
  validFunctions: number;
  missingFunctions: number;
  overallScore: number; // 0-100
}

export interface ValidationReport {
  timestamp: Date;
  summary: ValidationSummary;
  tables: TableValidation[];
  indexes: IndexValidation[];
  policies: PolicyValidation[];
  functions: FunctionValidation[];
  migrations: MigrationValidation[];
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

// ===============================
// SQL GENERATION
// ===============================

export interface SqlScript {
  name: string;
  description: string;
  sql: string;
  order: number;
  dependencies?: string[];
  isReversible: boolean;
  rollbackSql?: string;
}

export interface SqlGenerationResult {
  success: boolean;
  scripts: SqlScript[];
  summary: {
    totalScripts: number;
    totalTables: number;
    totalIndexes: number;
    totalPolicies: number;
    totalFunctions: number;
  };
  errors: string[];
  warnings: string[];
}

// ===============================
// EXECUÇÃO E MONITORAMENTO
// ===============================

export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // em milissegundos
  sql?: string;
  result?: any;
  error?: string;
}

export interface ExecutionProgress {
  stepId: string;
  currentStep: number;
  totalSteps: number;
  currentStepName: string;
  percentage: number;
  estimatedTimeRemaining?: number; // em segundos
  currentStatus: ExecutionStep['status'];
}

export interface ExecutionResult {
  success: boolean;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // em milissegundos
  steps: ExecutionStep[];
  rollbackExecuted: boolean;
  error?: string;
  summary: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    skippedSteps: number;
  };
}

// ===============================
// CONFIGURAÇÃO DO SISTEMA
// ===============================

export interface DatabaseValidationConfig {
  enabled: boolean;
  autoFix: boolean;
  createBackups: boolean;
  validationLevel: 'basic' | 'detailed' | 'comprehensive';
  timeout: number; // em milissegundos
  retryAttempts: number;
  batchSize: number;
  skipTables?: string[];
  onlyValidateTables?: string[];
}

export interface DatabaseSetupConfig {
  validation: DatabaseValidationConfig;
  execution: {
    timeout: number;
    batchSize: number;
    enableRollback: boolean;
    backupBeforeChanges: boolean;
  };
  notifications: {
    enableEmail: boolean;
    enableInApp: boolean;
    enablePush: boolean;
  };
}

// ===============================
// COMPONENTES DE UI
// ===============================

export interface DatabaseSetupState {
  isOpen: boolean;
  isValidating: boolean;
  isExecuting: boolean;
  report?: ValidationReport;
  progress?: ExecutionProgress;
  result?: ExecutionResult;
  error?: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  table?: string;
  column?: string;
  message: string;
  suggestion?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SetupAction {
  id: string;
  label: string;
  description: string;
  type: 'create' | 'alter' | 'drop' | 'recreate';
  targetType: 'table' | 'index' | 'policy' | 'function';
  target: string;
  sql: string;
  estimatedTime: number; // em segundos
  size: 'small' | 'medium' | 'large';
}

// ===============================
// SCHEMA DEFINITIONS
// ===============================

export interface DatabaseSchema {
  tables: Record<string, TableDefinition>;
  indexes: Record<string, IndexDefinition>;
  policies: Record<string, PolicyDefinition>;
  functions: Record<string, FunctionDefinition>;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeyDefinition[];
  uniqueConstraints?: string[][];
  checkConstraints?: string[];
  description?: string;
}

export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  unique?: boolean;
  where?: string;
  description?: string;
}

export interface PolicyDefinition {
  name: string;
  tableName: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  using: string;
  withCheck?: string;
  description?: string;
}

export interface FunctionDefinition {
  name: string;
  signature: string;
  returnType: string;
  language: 'sql' | 'plpgsql' | 'plpython' | 'plperl';
  security: 'SECURITY DEFINER' | 'SECURITY INVOKER';
  description?: string;
}

export interface ForeignKeyDefinition {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
}

// ===============================
// UTILITY TYPES
// ===============================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ===============================
// CONSTANTS
// ===============================

export const VALIDATION_LEVELS = {
  basic: {
    description: 'Validação básica - verifica existência de tabelas principais',
    timeout: 10000,
  },
  detailed: {
    description: 'Validação detalhada - inclui colunas e constraints',
    timeout: 30000,
  },
  comprehensive: {
    description: 'Validação completa - inclui índices, políticas e funções',
    timeout: 60000,
  },
} as const;

export const MAX_RETRY_ATTEMPTS = 3;

export const DEFAULT_TIMEOUT = 30000;

export const PROGRESS_UPDATE_INTERVAL = 1000; // 1 segundo

// ===============================
// ERROR TYPES
// ===============================

export class DatabaseValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseValidationError';
  }
}

export class DatabaseSetupError extends Error {
  constructor(
    message: string,
    public step?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseSetupError';
  }
}

export class SqlGenerationError extends Error {
  constructor(
    message: string,
    public table?: string,
    public column?: string
  ) {
    super(message);
    this.name = 'SqlGenerationError';
  }
}

// ===============================
// EXPORTS ADICIONAIS PARA COMPATIBILIDADE
// ===============================

export type SupabaseTable = keyof Database['public']['Tables'];

export type ValidationResult<T> = {
  isValid: boolean;
  data?: T;
  error?: string;
};

export type DatabaseOperation = 
  | 'validate'
  | 'generate'
  | 'execute'
  | 'rollback'
  | 'backup'
  | 'restore';

export type ExecutionMode = 
  | 'dry-run'
  | 'interactive'
  | 'automatic'
  | 'script';

export {
  // Re-export common Supabase types for convenience
  type PostgrestSingleResponse,
  type PostgrestListResponse,
  type PostgrestError,
} from '@supabase/supabase-js';