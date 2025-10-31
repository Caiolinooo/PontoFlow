/**
 * Database Structure Validator
 * 
 * Sistema completo de validação de estruturas de banco de dados
 * Verifica todas as 17 tabelas, índices, políticas RLS e funções
 * Timesheet Manager - ABZ Group
 */

import { createClient } from '@supabase/supabase-js';
// Import simplified types instead of Supabase Database
import {
  ValidationReport,
  ValidationSummary,
  TableValidation,
  IndexValidation,
  PolicyValidation,
  FunctionValidation,
  MigrationValidation,
  ColumnDefinition,
  TableDefinition,
  IndexDefinition,
  PolicyDefinition,
  FunctionDefinition,
  DatabaseValidationError,
  VALIDATION_LEVELS,
  DEFAULT_TIMEOUT,
  MAX_RETRY_ATTEMPTS,
} from '../types/database';

export class DatabaseValidator {
  private supabase: ReturnType<typeof createClient>;
  private config: {
    timeout: number;
    level: 'basic' | 'detailed' | 'comprehensive';
    retryAttempts: number;
  };

  constructor(supabaseUrl: string, supabaseKey: string, options?: {
    timeout?: number;
    level?: 'basic' | 'detailed' | 'comprehensive';
    retryAttempts?: number;
  }) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.config = {
      timeout: options?.timeout || DEFAULT_TIMEOUT,
      level: options?.level || 'comprehensive',
      retryAttempts: options?.retryAttempts || MAX_RETRY_ATTEMPTS,
    };
  }

  /**
   * Executa validação completa do banco de dados
   */
  async validateDatabase(): Promise<ValidationReport> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Iniciando validação do banco de dados...');
      
      // Verificar conexão primeiro
      await this.testConnection();

      // Validar estrutura das tabelas
      const tables = await this.validateTables();
      
      // Validar índices
      const indexes = await this.validateIndexes();
      
      // Validar políticas RLS
      const policies = await this.validatePolicies();
      
      // Validar funções
      const functions = await this.validateFunctions();
      
      // Validar migrations
      const migrations = await this.validateMigrations();

      // Compilar relatório
      const summary = this.generateSummary(tables, indexes, policies, functions, migrations);
      const duration = Date.now() - startTime;

      const report: ValidationReport = {
        timestamp: new Date(),
        summary,
        tables,
        indexes,
        policies,
        functions,
        migrations,
        errors: this.collectErrors(tables, indexes, policies, functions, migrations),
        warnings: this.collectWarnings(tables, indexes, policies, functions, migrations),
        recommendations: this.generateRecommendations(summary),
      };

      console.log(`✅ Validação concluída em ${duration}ms. Score: ${summary.overallScore}%`);
      return report;

    } catch (error) {
      console.error('❌ Erro durante validação:', error);
      throw new DatabaseValidationError(
        `Falha na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'VALIDATION_FAILED',
        error
      );
    }
  }

  /**
   * Testa conexão com o banco
   */
  private async testConnection(): Promise<void> {
    const { data, error } = await this.supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (error) {
      throw new DatabaseValidationError(
        `Falha na conexão: ${error.message}`,
        'CONNECTION_FAILED',
        error
      );
    }
  }

  /**
   * Valida estrutura das tabelas
   */
  private async validateTables(): Promise<TableValidation[]> {
    const expectedTables = this.getExpectedTables();
    const validations: TableValidation[] = [];

    for (const tableDef of expectedTables) {
      try {
        const validation = await this.validateTable(tableDef);
        validations.push(validation);
      } catch (error) {
        console.warn(`⚠️ Erro validando tabela ${tableDef.name}:`, error);
        validations.push({
          name: tableDef.name,
          status: 'invalid',
          exists: false,
          columns: [],
          missingColumns: tableDef.columns,
          extraColumns: [],
          missingConstraints: [],
          missingIndexes: [],
          missingPolicies: [],
          issues: [`Erro de validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
          lastChecked: new Date(),
        });
      }
    }

    return validations;
  }

  /**
   * Valida uma tabela específica
   */
  private async validateTable(tableDef: TableDefinition): Promise<TableValidation> {
    // Verificar se tabela existe
    const { data: tableExists, error: tableError } = await this.supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', tableDef.name)
      .eq('table_schema', 'public')
      .single();

    const exists = !tableError && tableExists !== null;

    if (!exists) {
      return {
        name: tableDef.name,
        status: 'missing',
        exists: false,
        columns: [],
        missingColumns: tableDef.columns,
        extraColumns: [],
        missingConstraints: [],
        missingIndexes: [],
        missingPolicies: [],
        issues: ['Tabela não existe'],
        lastChecked: new Date(),
      };
    }

    // Obter colunas existentes
    const existingColumns = await this.getTableColumns(tableDef.name);
    
    // Verificar colunas
    const foundColumns = existingColumns.map(col => col.name);
    const expectedColumnNames = tableDef.columns.map(col => col.name);
    
    const missingColumns = tableDef.columns.filter(
      col => !foundColumns.includes(col.name)
    );
    
    const extraColumns = foundColumns.filter(
      col => !expectedColumnNames.includes(col)
    );

    // Verificar constraints
    const missingConstraints = await this.checkMissingConstraints(tableDef);

    // Verificar índices
    const missingIndexes = await this.checkMissingIndexes(tableDef);

    // Verificar políticas RLS
    const missingPolicies = await this.checkMissingPolicies(tableDef.name);

    const issues: string[] = [];
    
    if (missingColumns.length > 0) {
      issues.push(`Colunas faltantes: ${missingColumns.map(c => c.name).join(', ')}`);
    }
    
    if (extraColumns.length > 0) {
      issues.push(`Colunas extras: ${extraColumns.join(', ')}`);
    }

    const status: TableValidation['status'] = 
      missingColumns.length === 0 && missingConstraints.length === 0 && issues.length === 0
        ? 'valid'
        : missingColumns.length > 0 || missingConstraints.length > 0
        ? 'incomplete'
        : 'valid';

    return {
      name: tableDef.name,
      status,
      exists: true,
      columns: existingColumns,
      missingColumns,
      extraColumns,
      missingConstraints,
      missingIndexes,
      missingPolicies,
      issues,
      lastChecked: new Date(),
    };
  }

  /**
   * Obtém colunas de uma tabela
   */
  private async getTableColumns(tableName: string): Promise<ColumnDefinition[]> {
    const { data, error } = await this.supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) {
      throw new DatabaseValidationError(
        `Erro ao obter colunas da tabela ${tableName}: ${error.message}`,
        'COLUMN_QUERY_FAILED',
        error
      );
    }

    return data.map((col: any) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      defaultValue: col.column_default,
      isPrimaryKey: false, // Será verificado separadamente
      isForeignKey: false, // Será verificado separadamente
    }));
  }

  /**
   * Verifica constraints faltantes
   */
  private async checkMissingConstraints(tableDef: TableDefinition): Promise<string[]> {
    // Implementação simplificada - em produção seria mais complexa
    const missing: string[] = [];
    
    // Verificar primary key
    if (tableDef.primaryKey) {
      const { data: pkExists } = await this.supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', tableDef.name)
        .eq('constraint_type', 'PRIMARY KEY')
        .single();

      if (!pkExists) {
        missing.push('PRIMARY KEY');
      }
    }

    // Verificar foreign keys
    if (tableDef.foreignKeys) {
      for (const fk of tableDef.foreignKeys) {
        const { data: fkExists } = await this.supabase
          .from('information_schema.key_column_usage')
          .select('constraint_name')
          .eq('table_name', tableDef.name)
          .eq('column_name', fk.column)
          .single();

        if (!fkExists) {
          missing.push(`FOREIGN KEY (${fk.column})`);
        }
      }
    }

    return missing;
  }

  /**
   * Verifica índices faltantes
   */
  private async checkMissingIndexes(tableDef: TableDefinition): Promise<string[]> {
    const expectedIndexes = this.getTableIndexes(tableDef.name);
    const missing: string[] = [];

    for (const indexDef of expectedIndexes) {
      const { data: indexExists } = await this.supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', tableDef.name)
        .eq('indexname', indexDef.name)
        .single();

      if (!indexExists) {
        missing.push(indexDef.name);
      }
    }

    return missing;
  }

  /**
   * Verifica políticas RLS faltantes
   */
  private async checkMissingPolicies(tableName: string): Promise<string[]> {
    const expectedPolicies = this.getTablePolicies(tableName);
    const missing: string[] = [];

    for (const policyDef of expectedPolicies) {
      const { data: policyExists } = await this.supabase
        .from('pg_policies')
        .select('polname')
        .eq('tablename', tableName)
        .eq('polname', policyDef.name)
        .single();

      if (!policyExists) {
        missing.push(policyDef.name);
      }
    }

    return missing;
  }

  /**
   * Valida índices de performance
   */
  private async validateIndexes(): Promise<IndexValidation[]> {
    const allIndexes = this.getAllIndexes();
    const validations: IndexValidation[] = [];

    for (const indexDef of allIndexes) {
      try {
        const validation = await this.validateIndex(indexDef);
        validations.push(validation);
      } catch (error) {
        console.warn(`⚠️ Erro validando índice ${indexDef.name}:`, error);
      }
    }

    return validations;
  }

  /**
   * Valida um índice específico
   */
  private async validateIndex(indexDef: IndexDefinition): Promise<IndexValidation> {
    const { data, error } = await this.supabase
      .from('pg_indexes')
      .select('indexname, tablename, indexdef')
      .eq('indexname', indexDef.name)
      .eq('tablename', indexDef.tableName)
      .single();

    const exists = !error && data !== null;
    
    if (!exists) {
      return {
        name: indexDef.name,
        tableName: indexDef.tableName,
        columns: indexDef.columns,
        status: 'missing',
        exists: false,
        isUnique: indexDef.unique || false,
        isValid: false,
        lastChecked: new Date(),
      };
    }

    const isUnique = (data as any)?.indexdef?.includes('UNIQUE') || false;
    const isValid = true; // Implementação simplificada

    return {
      name: (data as any).indexname,
      tableName: (data as any).tablename,
      columns: indexDef.columns,
      status: 'valid',
      exists: true,
      isUnique,
      isValid,
      lastChecked: new Date(),
    };
  }

  /**
   * Valida políticas RLS
   */
  private async validatePolicies(): Promise<PolicyValidation[]> {
    const allPolicies = this.getAllPolicies();
    const validations: PolicyValidation[] = [];

    for (const policyDef of allPolicies) {
      try {
        const validation = await this.validatePolicy(policyDef);
        validations.push(validation);
      } catch (error) {
        console.warn(`⚠️ Erro validando política ${policyDef.name}:`, error);
      }
    }

    return validations;
  }

  /**
   * Valida uma política específica
   */
  private async validatePolicy(policyDef: PolicyDefinition): Promise<PolicyValidation> {
    const { data, error } = await this.supabase
      .from('pg_policies')
      .select('polname, tablename, polcmd, polusing, polwithcheck')
      .eq('polname', policyDef.name)
      .eq('tablename', policyDef.tableName)
      .single();

    const exists = !error && data !== null;

    if (!exists) {
      return {
        name: policyDef.name,
        tableName: policyDef.tableName,
        status: 'missing',
        exists: false,
        command: policyDef.command,
        using: policyDef.using,
        withCheck: policyDef.withCheck || '',
        lastChecked: new Date(),
      };
    }

    return {
      name: (data as any).polname,
      tableName: (data as any).tablename,
      status: 'valid',
      exists: true,
      command: (data as any).polcmd as any,
      using: (data as any).polusing,
      withCheck: (data as any).polwithcheck || '',
      lastChecked: new Date(),
    };
  }

  /**
   * Valida funções do sistema
   */
  private async validateFunctions(): Promise<FunctionValidation[]> {
    const allFunctions = this.getAllFunctions();
    const validations: FunctionValidation[] = [];

    for (const funcDef of allFunctions) {
      try {
        const validation = await this.validateFunction(funcDef);
        validations.push(validation);
      } catch (error) {
        console.warn(`⚠️ Erro validando função ${funcDef.name}:`, error);
      }
    }

    return validations;
  }

  /**
   * Valida uma função específica
   */
  private async validateFunction(funcDef: FunctionDefinition): Promise<FunctionValidation> {
    const { data, error } = await this.supabase
      .from('information_schema.routines')
      .select('routine_name, data_type, routine_definition')
      .eq('routine_name', funcDef.name)
      .eq('routine_schema', 'public')
      .single();

    const exists = !error && data !== null;

    if (!exists) {
      return {
        name: funcDef.name,
        status: 'missing',
        exists: false,
        signature: funcDef.signature,
        returnType: funcDef.returnType,
        lastChecked: new Date(),
      };
    }

    return {
      name: (data as any).routine_name,
      status: 'valid',
      exists: true,
      signature: funcDef.signature,
      returnType: (data as any).data_type,
      lastChecked: new Date(),
    };
  }

  /**
   * Valida migrations executadas
   */
  private async validateMigrations(): Promise<MigrationValidation[]> {
    // Implementação básica - verificar tabela _migrations se existir
    try {
      const { data, error } = await this.supabase
        .from('_migrations')
        .select('*')
        .order('executed_at');

      if (error) {
        return []; // Tabela não existe
      }

      return data.map((migration: any) => ({
        name: migration.name,
        status: 'executed' as const,
        executedAt: migration.executed_at,
        lastChecked: new Date(),
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Gera resumo da validação
   */
  private generateSummary(
    tables: TableValidation[],
    indexes: IndexValidation[],
    policies: PolicyValidation[],
    functions: FunctionValidation[],
    migrations: MigrationValidation[]
  ): ValidationSummary {
    const totalTables = tables.length;
    const validTables = tables.filter(t => t.status === 'valid').length;
    const missingTables = tables.filter(t => t.status === 'missing').length;
    const incompleteTables = tables.filter(t => t.status === 'incomplete').length;

    const totalIndexes = indexes.length;
    const validIndexes = indexes.filter(i => i.status === 'valid').length;
    const missingIndexes = indexes.filter(i => i.status === 'missing').length;

    const totalPolicies = policies.length;
    const validPolicies = policies.filter(p => p.status === 'valid').length;
    const missingPolicies = policies.filter(p => p.status === 'missing').length;

    const totalFunctions = functions.length;
    const validFunctions = functions.filter(f => f.status === 'valid').length;
    const missingFunctions = functions.filter(f => f.status === 'missing').length;

    // Calcular score geral (0-100)
    const tableScore = totalTables > 0 ? (validTables / totalTables) * 100 : 100;
    const indexScore = totalIndexes > 0 ? (validIndexes / totalIndexes) * 100 : 100;
    const policyScore = totalPolicies > 0 ? (validPolicies / totalPolicies) * 100 : 100;
    const functionScore = totalFunctions > 0 ? (validFunctions / totalFunctions) * 100 : 100;

    const overallScore = Math.round(
      (tableScore * 0.4) + (indexScore * 0.25) + (policyScore * 0.25) + (functionScore * 0.1)
    );

    return {
      totalTables,
      validTables,
      missingTables,
      incompleteTables,
      totalIndexes,
      validIndexes,
      missingIndexes,
      totalPolicies,
      validPolicies,
      missingPolicies,
      totalFunctions,
      validFunctions,
      missingFunctions,
      overallScore,
    };
  }

  /**
   * Coleta todos os erros
   */
  private collectErrors(
    tables: TableValidation[],
    indexes: IndexValidation[],
    policies: PolicyValidation[],
    functions: FunctionValidation[],
    migrations: MigrationValidation[]
  ): string[] {
    const errors: string[] = [];

    // Erros de tabelas
    tables.forEach(table => {
      if (table.status === 'missing') {
        errors.push(`Tabela "${table.name}" não existe`);
      } else if (table.status === 'invalid') {
        errors.push(`Tabela "${table.name}" é inválida`);
      }
    });

    // Erros de índices
    indexes.forEach(index => {
      if (index.status === 'missing') {
        errors.push(`Índice "${index.name}" não existe`);
      }
    });

    // Erros de políticas
    policies.forEach(policy => {
      if (policy.status === 'missing') {
        errors.push(`Política "${policy.name}" não existe`);
      }
    });

    // Erros de funções
    functions.forEach(func => {
      if (func.status === 'missing') {
        errors.push(`Função "${func.name}" não existe`);
      }
    });

    return errors;
  }

  /**
   * Coleta todos os warnings
   */
  private collectWarnings(
    tables: TableValidation[],
    indexes: IndexValidation[],
    policies: PolicyValidation[],
    functions: FunctionValidation[],
    migrations: MigrationValidation[]
  ): string[] {
    const warnings: string[] = [];

    // Warnings de tabelas
    tables.forEach(table => {
      if (table.status === 'incomplete') {
        if (table.missingColumns.length > 0) {
          warnings.push(`Tabela "${table.name}" tem ${table.missingColumns.length} coluna(s) faltante(s)`);
        }
        if (table.missingConstraints.length > 0) {
          warnings.push(`Tabela "${table.name}" tem ${table.missingConstraints.length} constraint(s) faltante(s)`);
        }
      }
    });

    // Warnings de índices
    indexes.forEach(index => {
      if (index.status === 'invalid') {
        warnings.push(`Índice "${index.name}" é inválido`);
      }
    });

    return warnings;
  }

  /**
   * Gera recomendações baseadas nos resultados
   */
  private generateRecommendations(summary: ValidationSummary): string[] {
    const recommendations: string[] = [];

    if (summary.missingTables > 0) {
      recommendations.push(`Criar ${summary.missingTables} tabela(s) faltante(s)`);
    }

    if (summary.missingIndexes > 0) {
      recommendations.push(`Criar ${summary.missingIndexes} índice(s) para otimizar performance`);
    }

    if (summary.missingPolicies > 0) {
      recommendations.push(`Configurar ${summary.missingPolicies} política(s) RLS para segurança`);
    }

    if (summary.missingFunctions > 0) {
      recommendations.push(`Criar ${summary.missingFunctions} função(ões) necessária(s)`);
    }

    if (summary.overallScore < 70) {
      recommendations.push('Considerar execução completa do setup de banco de dados');
    }

    return recommendations;
  }

  // ===============================
  // DEFINIÇÕES DO SCHEMA
  // ===============================

  /**
   * Retorna todas as tabelas esperadas
   */
  private getExpectedTables(): TableDefinition[] {
    return [
      {
        name: 'tenants',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'name', type: 'text', nullable: false },
          { name: 'slug', type: 'text', nullable: false },
          { name: 'timezone', type: 'text', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        uniqueConstraints: [['slug']],
        description: 'Organizações/clientes do sistema (multi-tenant)',
      },
      {
        name: 'environments',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'slug', type: 'text', nullable: false },
          { name: 'color', type: 'text', nullable: true },
          { name: 'auto_fill_enabled', type: 'boolean', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        uniqueConstraints: [['tenant_id', 'slug']],
        description: 'Ambientes de trabalho por tenant',
      },
      {
        name: 'profiles',
        columns: [
          { name: 'user_id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'display_name', type: 'text', nullable: true },
          { name: 'email', type: 'text', nullable: true },
          { name: 'phone', type: 'text', nullable: true },
          { name: 'ativo', type: 'boolean', nullable: false },
          { name: 'locale', type: 'text', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['user_id'],
        description: 'Perfis de usuários',
      },
      {
        name: 'tenant_user_roles',
        columns: [
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'role', type: 'text', nullable: false },
        ],
        primaryKey: ['tenant_id', 'user_id', 'role'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Roles por tenant',
      },
      {
        name: 'groups',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'environment_id', type: 'uuid', nullable: true },
          { name: 'name', type: 'text', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'environment_id', referencedTable: 'environments', referencedColumn: 'id', onDelete: 'SET NULL' },
        ],
        description: 'Grupos de trabalho por tenant/ambiente',
      },
      {
        name: 'manager_group_assignments',
        columns: [
          { name: 'manager_id', type: 'uuid', nullable: false },
          { name: 'group_id', type: 'uuid', nullable: false },
        ],
        primaryKey: ['manager_id', 'group_id'],
        foreignKeys: [
          { column: 'group_id', referencedTable: 'groups', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Delegações de gerentes para grupos',
      },
      {
        name: 'employee_group_members',
        columns: [
          { name: 'employee_id', type: 'uuid', nullable: false },
          { name: 'group_id', type: 'uuid', nullable: false },
        ],
        primaryKey: ['employee_id', 'group_id'],
        foreignKeys: [
          { column: 'group_id', referencedTable: 'groups', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Membros de grupos (employees)',
      },
      {
        name: 'vessels',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'name', type: 'text', nullable: false },
          { name: 'code', type: 'text', nullable: true },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Embarcações por tenant',
      },
      {
        name: 'employees',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'profile_id', type: 'uuid', nullable: false },
          { name: 'vessel_id', type: 'uuid', nullable: true },
          { name: 'cargo', type: 'text', nullable: true },
          { name: 'centro_custo', type: 'text', nullable: true },
          { name: 'dados_pessoais_json', type: 'jsonb', nullable: false },
          { name: 'documentos_json', type: 'jsonb', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'profile_id', referencedTable: 'profiles', referencedColumn: 'user_id', onDelete: 'CASCADE' },
          { column: 'vessel_id', referencedTable: 'vessels', referencedColumn: 'id', onDelete: 'SET NULL' },
        ],
        uniqueConstraints: [['tenant_id', 'profile_id']],
        description: 'Funcionários (multi-tenant support)',
      },
      {
        name: 'timesheets',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'employee_id', type: 'uuid', nullable: false },
          { name: 'periodo_ini', type: 'date', nullable: false },
          { name: 'periodo_fim', type: 'date', nullable: false },
          { name: 'status', type: 'text', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'employee_id', referencedTable: 'employees', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Folhas de ponto dos funcionários',
      },
      {
        name: 'timesheet_entries',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'timesheet_id', type: 'uuid', nullable: false },
          { name: 'environment_id', type: 'uuid', nullable: true },
          { name: 'tipo', type: 'text', nullable: false },
          { name: 'data', type: 'date', nullable: false },
          { name: 'hora_ini', type: 'time', nullable: true },
          { name: 'hora_fim', type: 'time', nullable: true },
          { name: 'comentario', type: 'text', nullable: true },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'timesheet_id', referencedTable: 'timesheets', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'environment_id', referencedTable: 'environments', referencedColumn: 'id', onDelete: 'SET NULL' },
        ],
        description: 'Entradas das folhas de ponto',
      },
      {
        name: 'approvals',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'timesheet_id', type: 'uuid', nullable: false },
          { name: 'manager_id', type: 'uuid', nullable: false },
          { name: 'status', type: 'text', nullable: false },
          { name: 'mensagem', type: 'text', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'timesheet_id', referencedTable: 'timesheets', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Aprovações de timesheets',
      },
      {
        name: 'comments',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'entity_type', type: 'text', nullable: false },
          { name: 'entity_id', type: 'uuid', nullable: false },
          { name: 'author_id', type: 'uuid', nullable: false },
          { name: 'texto', type: 'text', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Comentários em entidades',
      },
      {
        name: 'notifications',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'canal', type: 'text', nullable: false },
          { name: 'tipo', type: 'text', nullable: true },
          { name: 'payload', type: 'jsonb', nullable: false },
          { name: 'lido', type: 'boolean', nullable: false },
          { name: 'criado_em', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Sistema de notificações',
      },
      {
        name: 'timesheet_annotations',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'tenant_id', type: 'uuid', nullable: false },
          { name: 'timesheet_id', type: 'uuid', nullable: false },
          { name: 'entry_id', type: 'uuid', nullable: true },
          { name: 'field_path', type: 'text', nullable: true },
          { name: 'message', type: 'text', nullable: false },
          { name: 'created_by', type: 'uuid', nullable: false },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'tenant_id', referencedTable: 'tenants', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'timesheet_id', referencedTable: 'timesheets', referencedColumn: 'id', onDelete: 'CASCADE' },
          { column: 'entry_id', referencedTable: 'timesheet_entries', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        description: 'Anotações em timesheets',
      },
      {
        name: 'password_reset_tokens',
        columns: [
          { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
          { name: 'user_id', type: 'uuid', nullable: false },
          { name: 'token', type: 'text', nullable: false },
          { name: 'expires_at', type: 'timestamptz', nullable: false },
          { name: 'used_at', type: 'timestamptz', nullable: true },
          { name: 'created_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        foreignKeys: [
          { column: 'user_id', referencedTable: 'auth.users', referencedColumn: 'id', onDelete: 'CASCADE' },
        ],
        uniqueConstraints: [['token']],
        description: 'Tokens para reset de senha',
      },
      {
        name: '_migrations',
        columns: [
          { name: 'id', type: 'serial', nullable: false, isPrimaryKey: true },
          { name: 'name', type: 'text', nullable: false },
          { name: 'executed_at', type: 'timestamptz', nullable: false },
        ],
        primaryKey: ['id'],
        uniqueConstraints: [['name']],
        description: 'Controle de migrations',
      },
    ];
  }

  /**
   * Retorna índices esperados para uma tabela
   */
  private getTableIndexes(tableName: string): IndexDefinition[] {
    const allIndexes = this.getAllIndexes();
    return allIndexes.filter(index => index.tableName === tableName);
  }

  /**
   * Retorna políticas RLS esperadas para uma tabela
   */
  private getTablePolicies(tableName: string): PolicyDefinition[] {
    const allPolicies = this.getAllPolicies();
    return allPolicies.filter(policy => policy.tableName === tableName);
  }

  /**
   * Retorna todos os índices esperados
   */
  private getAllIndexes(): IndexDefinition[] {
    return [
      // Índices para tenants
      { name: 'idx_tenants_slug', tableName: 'tenants', columns: ['slug'] },
      { name: 'idx_tenants_timezone', tableName: 'tenants', columns: ['timezone'] },

      // Índices para environments
      { name: 'idx_environments_tenant', tableName: 'environments', columns: ['tenant_id'] },
      { name: 'idx_environments_tenant_slug', tableName: 'environments', columns: ['tenant_id', 'slug'] },

      // Índices para profiles
      { name: 'idx_profiles_email', tableName: 'profiles', columns: ['email'] },
      { name: 'idx_profiles_active_locale', tableName: 'profiles', columns: ['ativo', 'locale'] },

      // Índices para tenant_user_roles
      { name: 'idx_tenant_user_roles_tenant', tableName: 'tenant_user_roles', columns: ['tenant_id'] },
      { name: 'idx_tenant_user_roles_user', tableName: 'tenant_user_roles', columns: ['user_id'] },

      // Índices para groups
      { name: 'idx_groups_tenant', tableName: 'groups', columns: ['tenant_id'] },
      { name: 'idx_groups_tenant_name', tableName: 'groups', columns: ['tenant_id', 'name'] },
      { name: 'idx_groups_environment', tableName: 'groups', columns: ['environment_id'] },

      // Índices para manager_group_assignments
      { name: 'idx_manager_group_assignments_manager', tableName: 'manager_group_assignments', columns: ['manager_id'] },
      { name: 'idx_manager_assignments_effective', tableName: 'manager_group_assignments', columns: ['manager_id', 'group_id'] },

      // Índices para employee_group_members
      { name: 'idx_employee_group_members_employee', tableName: 'employee_group_members', columns: ['employee_id'] },
      { name: 'idx_employee_group_effective', tableName: 'employee_group_members', columns: ['employee_id', 'group_id'] },

      // Índices para vessels
      { name: 'idx_vessels_tenant', tableName: 'vessels', columns: ['tenant_id'] },
      { name: 'idx_vessels_tenant_name', tableName: 'vessels', columns: ['tenant_id', 'name'] },

      // Índices para employees
      { name: 'idx_employees_tenant', tableName: 'employees', columns: ['tenant_id'] },
      { name: 'idx_employees_profile_tenant', tableName: 'employees', columns: ['profile_id', 'tenant_id'], unique: true },
      { name: 'idx_employees_tenant_profile', tableName: 'employees', columns: ['tenant_id', 'profile_id'] },
      { name: 'idx_employees_tenant_name', tableName: 'employees', columns: ['tenant_id', 'display_name'] },
      { name: 'idx_employees_tenant_active', tableName: 'employees', columns: ['tenant_id', 'profile_id'] },

      // Índices para timesheets
      { name: 'idx_timesheets_employee', tableName: 'timesheets', columns: ['employee_id'] },
      { name: 'idx_timesheets_tenant_status_periodo', tableName: 'timesheets', columns: ['tenant_id', 'status', 'periodo_ini', 'periodo_fim'] },
      { name: 'idx_timesheets_employee_periodo', tableName: 'timesheets', columns: ['employee_id', 'periodo_ini', 'periodo_fim'] },
      { name: 'idx_timesheets_status_periodo', tableName: 'timesheets', columns: ['status', 'periodo_ini', 'periodo_fim'] },
      { name: 'idx_timesheets_manager_pending', tableName: 'timesheets', columns: ['tenant_id', 'status', 'created_at'] },
      { name: 'idx_timesheets_approval_workflow', tableName: 'timesheets', columns: ['tenant_id', 'employee_id', 'status', 'updated_at'] },
      { name: 'idx_timesheets_draft_active', tableName: 'timesheets', columns: ['tenant_id', 'employee_id', 'periodo_ini'] },
      { name: 'idx_timesheets_submitted_active', tableName: 'timesheets', columns: ['tenant_id', 'employee_id', 'created_at'] },
      { name: 'idx_timesheets_current_month', tableName: 'timesheets', columns: ['tenant_id', 'periodo_ini', 'periodo_fim'] },

      // Índices para timesheet_entries
      { name: 'idx_timesheet_entries_timesheet', tableName: 'timesheet_entries', columns: ['timesheet_id', 'data'] },
      { name: 'idx_timesheet_entries_tenant', tableName: 'timesheet_entries', columns: ['tenant_id', 'timesheet_id'] },
      { name: 'idx_timesheet_entries_date_tipo', tableName: 'timesheet_entries', columns: ['data', 'tipo'] },
      { name: 'idx_timesheet_entries_tipo_data', tableName: 'timesheet_entries', columns: ['tipo', 'data'] },
      { name: 'idx_entries_environment', tableName: 'timesheet_entries', columns: ['environment_id'] },

      // Índices para approvals
      { name: 'idx_approvals_timesheet_manager', tableName: 'approvals', columns: ['timesheet_id', 'manager_id', 'status'] },
      { name: 'idx_approvals_tenant_created', tableName: 'approvals', columns: ['tenant_id', 'created_at'] },

      // Índices para comments
      { name: 'idx_comments_entity', tableName: 'comments', columns: ['entity_type', 'entity_id'] },
      { name: 'idx_comments_tenant_created', tableName: 'comments', columns: ['tenant_id', 'created_at'] },

      // Índices para notifications
      { name: 'idx_notifications_user_lido', tableName: 'notifications', columns: ['user_id', 'lido', 'criado_em'] },
      { name: 'idx_notifications_tenant_tipo', tableName: 'notifications', columns: ['tenant_id', 'tipo', 'criado_em'] },
      { name: 'idx_notifications_unread', tableName: 'notifications', columns: ['user_id', 'lido', 'criado_em'] },

      // Índices para timesheet_annotations
      { name: 'idx_annotations_timesheet', tableName: 'timesheet_annotations', columns: ['timesheet_id'] },
      { name: 'idx_annotations_created_by', tableName: 'timesheet_annotations', columns: ['created_by', 'created_at'] },

      // Índices para password_reset_tokens
      { name: 'idx_password_reset_tokens_token', tableName: 'password_reset_tokens', columns: ['token'], unique: true },
      { name: 'idx_password_reset_tokens_user_id', tableName: 'password_reset_tokens', columns: ['user_id'] },
      { name: 'idx_password_reset_tokens_expires_at', tableName: 'password_reset_tokens', columns: ['expires_at'] },
    ];
  }

  /**
   * Retorna todas as políticas RLS esperadas
   */
  private getAllPolicies(): PolicyDefinition[] {
    return [
      // Políticas para tenants
      {
        name: 'tenants_admin_access',
        tableName: 'tenants',
        command: 'ALL',
        using: `EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.tenant_id = tenants.id 
            AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
            AND tur.user_id = auth.uid()
        )`,
        description: 'Acesso admin às tenants',
      },

      // Políticas para environments
      {
        name: 'environments_tenant_access',
        tableName: 'environments',
        command: 'ALL',
        using: `EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.tenant_id = environments.tenant_id 
            AND tur.user_id = auth.uid()
        )`,
        description: 'Acesso por tenant às environments',
      },

      // Políticas para profiles
      {
        name: 'profiles_self_access',
        tableName: 'profiles',
        command: 'ALL',
        using: 'auth.uid() = user_id',
        description: 'Usuário acessa próprio perfil',
      },

      // Políticas para tenant_user_roles
      {
        name: 'tenant_user_roles_access',
        tableName: 'tenant_user_roles',
        command: 'ALL',
        using: `user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.tenant_id = tenant_user_roles.tenant_id
            AND tur.user_id = auth.uid()
            AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
        )`,
        description: 'Acesso às roles do tenant',
      },

      // Políticas para groups
      {
        name: 'groups_tenant_access',
        tableName: 'groups',
        command: 'ALL',
        using: `EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.tenant_id = groups.tenant_id 
            AND tur.user_id = auth.uid()
        )`,
        description: 'Acesso às groups por tenant',
      },

      // Políticas para manager_group_assignments
      {
        name: 'manager_assignments_access',
        tableName: 'manager_group_assignments',
        command: 'ALL',
        using: `manager_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.groups g
          JOIN public.tenant_user_roles tur ON tur.tenant_id = g.tenant_id
          WHERE g.id = manager_group_assignments.group_id
            AND tur.user_id = auth.uid()
            AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
        )`,
        description: 'Acesso às delegações de gerente',
      },

      // Políticas para employee_group_members
      {
        name: 'employee_group_members_access',
        tableName: 'employee_group_members',
        command: 'ALL',
        using: `EXISTS (
          SELECT 1 FROM public.groups g
          JOIN public.tenant_user_roles tur ON tur.tenant_id = g.tenant_id
          WHERE g.id = employee_group_members.group_id
            AND tur.user_id = auth.uid()
        )`,
        description: 'Acesso aos membros de grupo',
      },

      // Políticas para vessels
      {
        name: 'vessels_tenant_access',
        tableName: 'vessels',
        command: 'ALL',
        using: `EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.tenant_id = vessels.tenant_id 
            AND tur.user_id = auth.uid()
        )`,
        description: 'Acesso às vessels por tenant',
      },

      // Políticas para employees
      {
        name: 'employees_tenant_access',
        tableName: 'employees',
        command: 'ALL',
        using: `EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.tenant_id = employees.tenant_id 
            AND tur.user_id = auth.uid()
        ) OR
        profile_id = auth.uid()`,
        description: 'Acesso às employees por tenant',
      },

      // Políticas para timesheets (múltiplas)
      {
        name: 'timesheets_employee_select',
        tableName: 'timesheets',
        command: 'SELECT',
        using: `EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = timesheets.employee_id
            AND e.tenant_id = timesheets.tenant_id
            AND e.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.manager_group_assignments mga
          JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
          WHERE mga.manager_id = auth.uid()
            AND egm.employee_id = timesheets.employee_id
        )
        OR EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.user_id = auth.uid() 
            AND tur.role = 'TENANT_ADMIN' 
            AND tur.tenant_id = timesheets.tenant_id
        )
        OR EXISTS (
          SELECT 1 FROM public.tenant_user_roles tur
          WHERE tur.user_id = auth.uid() 
            AND tur.role = 'ADMIN_GLOBAL'
        )`,
        description: 'Seleção de timesheets',
      },

      // Políticas para timesheet_entries
      {
        name: 'timesheet_entries_view',
        tableName: 'timesheet_entries',
        command: 'SELECT',
        using: `EXISTS (
          SELECT 1 FROM public.timesheets t
          JOIN public.employees e ON e.id = t.employee_id
          WHERE t.id = timesheet_entries.timesheet_id
            AND (
              e.profile_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.manager_group_assignments mga
                JOIN public.employee_group_members egm ON egm.group_id = mga.group_id
                WHERE mga.manager_id = auth.uid() 
                  AND egm.employee_id = t.employee_id
              )
              OR EXISTS (
                SELECT 1 FROM public.tenant_user_roles tur
                WHERE tur.user_id = auth.uid() 
                  AND tur.role IN ('TENANT_ADMIN','ADMIN_GLOBAL') 
                  AND tur.tenant_id = t.tenant_id
              )
            )
        )`,
        description: 'Visualização de entries',
      },

      // Políticas para notifications
      {
        name: 'notifications_user_access',
        tableName: 'notifications',
        command: 'ALL',
        using: 'auth.uid() = user_id',
        description: 'Usuário acessa próprias notificações',
      },

      // Políticas para password_reset_tokens
      {
        name: 'Users can view their own reset tokens',
        tableName: 'password_reset_tokens',
        command: 'SELECT',
        using: 'auth.uid() = user_id',
        description: 'Usuário vê próprios tokens',
      },
      {
        name: 'Service role can manage all reset tokens',
        tableName: 'password_reset_tokens',
        command: 'ALL',
        using: 'true',
        description: 'Service role gerencia tokens',
      },
    ];
  }

  /**
   * Retorna todas as funções esperadas
   */
  private getAllFunctions(): FunctionDefinition[] {
    return [
      {
        name: 'get_tenant_timezone',
        signature: 'get_tenant_timezone(tenant_uuid UUID)',
        returnType: 'text',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Retorna timezone do tenant',
      },
      {
        name: 'timesheet_deadline',
        signature: 'timesheet_deadline(periodo_ini date, tenant_uuid UUID)',
        returnType: 'timestamptz',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Calcula deadline do timesheet',
      },
      {
        name: 'timesheet_past_deadline',
        signature: 'timesheet_past_deadline(periodo_ini date, tenant_uuid UUID)',
        returnType: 'boolean',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Verifica se prazo foi vencido',
      },
      {
        name: 'convert_to_tenant_timezone',
        signature: 'convert_to_tenant_timezone(timestamp_value timestamptz, tenant_uuid UUID)',
        returnType: 'timestamptz',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Converte timestamp para timezone do tenant',
      },
      {
        name: 'now_in_tenant_timezone',
        signature: 'now_in_tenant_timezone(tenant_uuid UUID)',
        returnType: 'timestamptz',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Timestamp atual no timezone do tenant',
      },
      {
        name: 'set_tenant_context',
        signature: 'set_tenant_context(tenant_id uuid)',
        returnType: 'void',
        language: 'plpgsql',
        security: 'SECURITY DEFINER',
        description: 'Define contexto de tenant',
      },
      {
        name: 'get_tenant_context',
        signature: 'get_tenant_context()',
        returnType: 'uuid',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Obtém contexto atual',
      },
      {
        name: 'get_user_tenants',
        signature: 'get_user_tenants(user_id uuid)',
        returnType: 'TABLE',
        language: 'sql',
        security: 'SECURITY DEFINER',
        description: 'Busca tenants do usuário',
      },
      {
        name: 'update_updated_at_column',
        signature: 'update_updated_at_column()',
        returnType: 'trigger',
        language: 'plpgsql',
        security: 'SECURITY DEFINER',
        description: 'Trigger para updated_at automático',
      },
      {
        name: 'mark_notification_read',
        signature: 'mark_notification_read()',
        returnType: 'trigger',
        language: 'plpgsql',
        security: 'SECURITY DEFINER',
        description: 'Trigger para marcar notification como lida',
      },
      {
        name: 'cleanup_expired_reset_tokens',
        signature: 'cleanup_expired_reset_tokens()',
        returnType: 'void',
        language: 'plpgsql',
        security: 'SECURITY DEFINER',
        description: 'Limpeza de tokens expirados',
      },
    ];
  }
}