/**
 * SQL Generator for Database Setup
 * 
 * Gerador automático de scripts SQL para criação de estruturas de banco
 * Baseado nos resultados da validação, gera SQL otimizado para correção
 * Timesheet Manager - ABZ Group
 */

import {
  ValidationReport,
  SqlScript,
  SqlGenerationResult,
  TableValidation,
  IndexValidation,
  PolicyValidation,
  FunctionValidation,
  TableDefinition,
  IndexDefinition,
  PolicyDefinition,
  FunctionDefinition,
  ColumnDefinition,
  ForeignKeyDefinition,
  SqlGenerationError,
} from '../types/database';

export class SqlGenerator {
  private tableScripts: Map<string, string> = new Map();
  private indexScripts: Map<string, string> = new Map();
  private policyScripts: Map<string, string> = new Map();
  private functionScripts: Map<string, string> = new Map();
  private migrationScripts: string[] = [];

  constructor() {
    this.initializeTableScripts();
    this.initializeIndexScripts();
    this.initializePolicyScripts();
    this.initializeFunctionScripts();
  }

  /**
   * Gera scripts SQL baseados no relatório de validação
   */
  generateSqlFromValidation(report: ValidationReport): SqlGenerationResult {
    try {
      const scripts: SqlScript[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      console.log('🔧 Gerando scripts SQL...');

      // Gerar scripts para tabelas faltantes
      const tableScripts = this.generateTableScripts(report.tables);
      scripts.push(...tableScripts);

      // Gerar scripts para índices faltantes
      const indexScripts = this.generateIndexScripts(report.indexes);
      scripts.push(...indexScripts);

      // Gerar scripts para políticas faltantes
      const policyScripts = this.generatePolicyScripts(report.policies);
      scripts.push(...policyScripts);

      // Gerar scripts para funções faltantes
      const functionScripts = this.generateFunctionScripts(report.functions);
      scripts.push(...functionScripts);

      // Ordenar scripts por dependências
      const orderedScripts = this.orderScriptsByDependencies(scripts);

      // Gerar script de migração completo
      const migrationScript = this.generateMigrationScript(orderedScripts);

      console.log(`✅ Gerados ${orderedScripts.length} scripts SQL`);

      return {
        success: true,
        scripts: orderedScripts,
        summary: {
          totalScripts: orderedScripts.length,
          totalTables: tableScripts.length,
          totalIndexes: indexScripts.length,
          totalPolicies: policyScripts.length,
          totalFunctions: functionScripts.length,
        },
        errors,
        warnings,
      };

    } catch (error) {
      console.error('❌ Erro na geração de SQL:', error);
      return {
        success: false,
        scripts: [],
        summary: {
          totalScripts: 0,
          totalTables: 0,
          totalIndexes: 0,
          totalPolicies: 0,
          totalFunctions: 0,
        },
        errors: [`Erro na geração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
        warnings: [],
      };
    }
  }

  /**
   * Gera scripts para tabelas faltantes
   */
  private generateTableScripts(tableValidations: TableValidation[]): SqlScript[] {
    const scripts: SqlScript[] = [];

    for (const validation of tableValidations) {
      if (validation.status === 'missing') {
        const script = this.generateCreateTableScript(validation.name);
        if (script) {
          scripts.push(script);
        }
      } else if (validation.status === 'incomplete') {
        // Gerar scripts para adicionar colunas faltantes
        if (validation.missingColumns.length > 0) {
          const script = this.generateAlterTableScript(validation.name, validation.missingColumns);
          if (script) {
            scripts.push(script);
          }
        }
      }
    }

    return scripts;
  }

  /**
   * Gera script CREATE TABLE
   */
  private generateCreateTableScript(tableName: string): SqlScript | null {
    const tableDefinition = this.getTableDefinition(tableName);
    if (!tableDefinition) {
      return null;
    }

    let sql = `-- Criar tabela ${tableName}\n`;
    sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;

    // Gerar colunas
    const columnDefs = tableDefinition.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      
      if (!col.nullable) {
        def += ' NOT NULL';
      }
      
      if (col.defaultValue) {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      
      return def;
    });

    // Adicionar primary key
    if (tableDefinition.primaryKey) {
      columnDefs.push(`  PRIMARY KEY (${tableDefinition.primaryKey.join(', ')})`);
    }

    sql += columnDefs.join(',\n');
    sql += '\n);\n\n';

    // Adicionar foreign keys
    if (tableDefinition.foreignKeys && tableDefinition.foreignKeys.length > 0) {
      sql += this.generateForeignKeyConstraints(tableName, tableDefinition.foreignKeys);
    }

    // Adicionar unique constraints
    if (tableDefinition.uniqueConstraints && tableDefinition.uniqueConstraints.length > 0) {
      for (const constraint of tableDefinition.uniqueConstraints) {
        sql += `\nALTER TABLE public.${tableName} ADD CONSTRAINT unique_${tableName}_${constraint.join('_')} UNIQUE (${constraint.join(', ')});\n`;
      }
    }

    // Adicionar check constraints
    if (tableDefinition.checkConstraints && tableDefinition.checkConstraints.length > 0) {
      for (const check of tableDefinition.checkConstraints) {
        sql += `\nALTER TABLE public.${tableName} ADD CONSTRAINT check_${tableName} CHECK (${check});\n`;
      }
    }

    // Habilitar RLS
    sql += `\n-- Habilitar Row Level Security\nALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`;

    // Adicionar comentário
    if (tableDefinition.description) {
      sql += `\nCOMMENT ON TABLE public.${tableName} IS '${tableDefinition.description}';\n`;
    }

    // Adicionar comentários nas colunas
    for (const column of tableDefinition.columns) {
      sql += `COMMENT ON COLUMN public.${tableName}.${column.name} IS '${column.type}';\n`;
    }

    return {
      name: `create_${tableName}`,
      description: `Criar tabela ${tableName}`,
      sql,
      order: this.getTableCreationOrder(tableName),
      dependencies: this.getTableDependencies(tableName),
      isReversible: true,
      rollbackSql: `DROP TABLE IF EXISTS public.${tableName} CASCADE;`,
    };
  }

  /**
   * Gera script ALTER TABLE para colunas faltantes
   */
  private generateAlterTableScript(tableName: string, missingColumns: ColumnDefinition[]): SqlScript {
    let sql = `-- Adicionar colunas à tabela ${tableName}\n`;

    for (const column of missingColumns) {
      let alterSql = `ALTER TABLE public.${tableName} ADD COLUMN ${column.name} ${column.type}`;
      
      if (!column.nullable) {
        alterSql += ' NOT NULL';
      }
      
      if (column.defaultValue) {
        alterSql += ` DEFAULT ${column.defaultValue}`;
      }
      
      sql += alterSql + ';\n';
    }

    return {
      name: `alter_${tableName}_add_columns`,
      description: `Adicionar colunas à tabela ${tableName}`,
      sql,
      order: this.getTableAlterOrder(tableName),
      dependencies: [tableName],
      isReversible: true,
      rollbackSql: `ALTER TABLE public.${tableName} DROP COLUMN ${missingColumns.map(c => c.name).join(', ')} CASCADE;`,
    };
  }

  /**
   * Gera constraints de foreign key
   */
  private generateForeignKeyConstraints(tableName: string, foreignKeys: ForeignKeyDefinition[]): string {
    let sql = '\n-- Foreign Key Constraints\n';
    
    for (const fk of foreignKeys) {
      const constraintName = `fk_${tableName}_${fk.column}_${fk.referencedTable}`;
      sql += `ALTER TABLE public.${tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${fk.column}) REFERENCES public.${fk.referencedTable}(${fk.referencedColumn})`;
      
      if (fk.onDelete) {
        sql += ` ON DELETE ${fk.onDelete}`;
      }
      
      if (fk.onUpdate) {
        sql += ` ON UPDATE ${fk.onUpdate}`;
      }
      
      sql += ';\n';
    }
    
    return sql;
  }

  /**
   * Gera scripts para índices faltantes
   */
  private generateIndexScripts(indexValidations: IndexValidation[]): SqlScript[] {
    const scripts: SqlScript[] = [];

    for (const validation of indexValidations) {
      if (validation.status === 'missing') {
        const script = this.generateCreateIndexScript(validation);
        if (script) {
          scripts.push(script);
        }
      }
    }

    return scripts;
  }

  /**
   * Gera script CREATE INDEX
   */
  private generateCreateIndexScript(indexValidation: IndexValidation): SqlScript {
    const indexDef = this.getIndexDefinition(indexValidation.name);
    if (!indexDef) {
      throw new SqlGenerationError(`Definição de índice não encontrada: ${indexValidation.name}`);
    }

    let sql = `-- Criar índice ${indexDef.name}\n`;
    sql += `CREATE`;
    
    if (indexDef.unique) {
      sql += ' UNIQUE';
    }
    
    sql += ` INDEX IF NOT EXISTS ${indexDef.name} ON public.${indexDef.tableName}`;
    
    if (indexDef.columns.length > 0) {
      sql += ` (${indexDef.columns.join(', ')})`;
    }
    
    if (indexDef.where) {
      sql += ` WHERE ${indexDef.where}`;
    }
    
    sql += ';\n';

    if (indexDef.description) {
      sql += `\nCOMMENT ON INDEX ${indexDef.name} IS '${indexDef.description}';\n`;
    }

    return {
      name: `create_index_${indexDef.name}`,
      description: `Criar índice ${indexDef.name}`,
      sql,
      order: this.getIndexCreationOrder(indexDef.tableName),
      dependencies: [indexDef.tableName],
      isReversible: true,
      rollbackSql: `DROP INDEX IF EXISTS ${indexDef.name};`,
    };
  }

  /**
   * Gera scripts para políticas RLS faltantes
   */
  private generatePolicyScripts(policyValidations: PolicyValidation[]): SqlScript[] {
    const scripts: SqlScript[] = [];

    for (const validation of policyValidations) {
      if (validation.status === 'missing') {
        const script = this.generateCreatePolicyScript(validation);
        if (script) {
          scripts.push(script);
        }
      }
    }

    return scripts;
  }

  /**
   * Gera script CREATE POLICY
   */
  private generateCreatePolicyScript(policyValidation: PolicyValidation): SqlScript {
    const policyDef = this.getPolicyDefinition(policyValidation.name);
    if (!policyDef) {
      throw new SqlGenerationError(`Definição de política não encontrada: ${policyValidation.name}`);
    }

    let sql = `-- Criar política RLS ${policyDef.name}\n`;
    sql += `CREATE POLICY ${policyDef.name} ON public.${policyDef.tableName}\n`;
    sql += `  FOR ${policyDef.command}\n`;
    sql += `  USING (${policyDef.using})`;
    
    if (policyDef.withCheck) {
      sql += `\n  WITH CHECK (${policyDef.withCheck})`;
    }
    
    sql += ';\n';

    if (policyDef.description) {
      sql += `\nCOMMENT ON POLICY ${policyDef.name} ON public.${policyDef.tableName} IS '${policyDef.description}';\n`;
    }

    return {
      name: `create_policy_${policyDef.name}`,
      description: `Criar política RLS ${policyDef.name}`,
      sql,
      order: this.getPolicyCreationOrder(policyDef.tableName),
      dependencies: [policyDef.tableName],
      isReversible: true,
      rollbackSql: `DROP POLICY IF EXISTS ${policyDef.name} ON public.${policyDef.tableName};`,
    };
  }

  /**
   * Gera scripts para funções faltantes
   */
  private generateFunctionScripts(functionValidations: FunctionValidation[]): SqlScript[] {
    const scripts: SqlScript[] = [];

    for (const validation of functionValidations) {
      if (validation.status === 'missing') {
        const script = this.generateCreateFunctionScript(validation);
        if (script) {
          scripts.push(script);
        }
      }
    }

    return scripts;
  }

  /**
   * Gera script CREATE FUNCTION
   */
  private generateCreateFunctionScript(functionValidation: FunctionValidation): SqlScript {
    const functionDef = this.getFunctionDefinition(functionValidation.name);
    if (!functionDef) {
      throw new SqlGenerationError(`Definição de função não encontrada: ${functionValidation.name}`);
    }

    const sql = this.getFunctionSql(functionDef);

    return {
      name: `create_function_${functionDef.name}`,
      description: `Criar função ${functionDef.name}`,
      sql,
      order: this.getFunctionCreationOrder(),
      dependencies: [],
      isReversible: true,
      rollbackSql: `DROP FUNCTION IF EXISTS public.${functionDef.name};`,
    };
  }

  /**
   * Gera script de migração completo
   */
  private generateMigrationScript(scripts: SqlScript[]): string {
    if (scripts.length === 0) {
      return '-- Nenhuma estrutura faltante encontrada\n';
    }

    let migrationSql = `-- Script de Migração Automática
-- Gerado automaticamente pelo Sistema de Validação de Banco de Dados
-- Data: ${new Date().toISOString()}
-- Total de scripts: ${scripts.length}

-- Configurações de sessão
SET statement_timeout = '300s';
SET client_min_messages = 'warning';

-- Iniciar transação
BEGIN;

`;

    // Adicionar cada script na ordem correta
    for (const script of scripts) {
      migrationSql += `\n-- ${script.description}\n`;
      migrationSql += script.sql;
      migrationSql += '\n';
    }

    // Finalizar transação
    migrationSql += `
-- Finalizar transação
COMMIT;

-- Resetar configurações
RESET statement_timeout;
RESET client_min_messages;

-- Registrar migration
INSERT INTO public._migrations (name, executed_at) 
VALUES ('auto_setup_${Date.now()}', NOW())
ON CONFLICT (name) DO NOTHING;
`;

    return migrationSql;
  }

  /**
   * Ordena scripts por dependências
   */
  private orderScriptsByDependencies(scripts: SqlScript[]): SqlScript[] {
    const ordered: SqlScript[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (script: SqlScript) => {
      if (visited.has(script.name)) return;
      if (visiting.has(script.name)) {
        throw new SqlGenerationError(`Dependência cíclica detectada: ${script.name}`);
      }

      visiting.add(script.name);

      // Visitar dependências primeiro
      if (script.dependencies) {
        for (const dep of script.dependencies) {
          const depScript = scripts.find(s => s.name === `create_${dep}` || s.name.includes(dep));
          if (depScript) {
            visit(depScript);
          }
        }
      }

      visiting.delete(script.name);
      visited.add(script.name);
      ordered.push(script);
    };

    for (const script of scripts) {
      if (!visited.has(script.name)) {
        visit(script);
      }
    }

    return ordered;
  }

  // ===============================
  // MÉTODOS AUXILIARES PARA DEFINIÇÕES
  // ===============================

  private getTableDefinition(tableName: string): TableDefinition | null {
    // Implementação baseada no DatabaseValidator
    const validator = new (require('./database-validator').DatabaseValidator)('dummy', 'dummy');
    const expectedTables = (validator as any).getExpectedTables();
    return expectedTables.find((t: any) => t.name === tableName) || null;
  }

  private getIndexDefinition(indexName: string): IndexDefinition | null {
    // Implementação simplificada - retorna null para forçar uso dos dados de validação
    return null;
  }

  private getPolicyDefinition(policyName: string): PolicyDefinition | null {
    // Implementação simplificada - retorna null para forçar uso dos dados de validação
    return null;
  }

  private getFunctionDefinition(functionName: string): FunctionDefinition | null {
    // Implementação simplificada - retorna null para forçar uso dos dados de validação
    return null;
  }

  private getFunctionSql(functionDef: FunctionDefinition): string {
    // Implementação básica - em produção retornaria SQL completo da função
    return `-- Criar função ${functionDef.name}
CREATE OR REPLACE FUNCTION public.${functionDef.signature}
RETURNS ${functionDef.returnType}
LANGUAGE ${functionDef.language}
${functionDef.security}
AS $$
BEGIN
  -- Implementação da função
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.${functionDef.name} IS '${functionDef.description}';
`;
  }

  // ===============================
  // ORDENAÇÃO DE SCRIPTS
  // ===============================

  private getTableCreationOrder(tableName: string): number {
    const order: Record<string, number> = {
      'tenants': 1,
      'environments': 2,
      'vessels': 2,
      'profiles': 3,
      'tenant_user_roles': 4,
      'groups': 5,
      'manager_group_assignments': 6,
      'employee_group_members': 6,
      'employees': 7,
      'timesheets': 8,
      'timesheet_entries': 9,
      'approvals': 10,
      'comments': 11,
      'notifications': 12,
      'timesheet_annotations': 13,
      'password_reset_tokens': 14,
      '_migrations': 15,
    };
    return order[tableName] || 50;
  }

  private getTableAlterOrder(tableName: string): number {
    return this.getTableCreationOrder(tableName) + 100;
  }

  private getIndexCreationOrder(tableName: string): number {
    return this.getTableCreationOrder(tableName) + 200;
  }

  private getPolicyCreationOrder(tableName: string): number {
    return this.getTableCreationOrder(tableName) + 300;
  }

  private getFunctionCreationOrder(): number {
    return 1000;
  }

  private getTableDependencies(tableName: string): string[] {
    const dependencies: Record<string, string[]> = {
      'environments': ['tenants'],
      'vessels': ['tenants'],
      'tenant_user_roles': ['tenants'],
      'groups': ['tenants', 'environments'],
      'manager_group_assignments': ['groups'],
      'employee_group_members': ['groups'],
      'employees': ['tenants', 'profiles', 'vessels'],
      'timesheets': ['tenants', 'employees'],
      'timesheet_entries': ['tenants', 'timesheets', 'environments'],
      'approvals': ['tenants', 'timesheets'],
      'comments': ['tenants'],
      'notifications': ['tenants'],
      'timesheet_annotations': ['tenants', 'timesheets', 'timesheet_entries'],
      'password_reset_tokens': [],
      '_migrations': [],
    };
    return dependencies[tableName] || [];
  }

  // ===============================
  // INICIALIZAÇÃO DE SCRIPTS PREDEFINIDOS
  // ===============================

  private initializeTableScripts(): void {
    // Scripts pré-definidos para tabelas críticas
    this.tableScripts.set('tenants', this.getTenantsTableScript());
  }

  private initializeIndexScripts(): void {
    // Scripts pré-definidos para índices críticos
    this.indexScripts.set('idx_tenants_slug', this.getTenantsIndexesScript());
  }

  private initializePolicyScripts(): void {
    // Scripts pré-definidos para políticas críticas
    this.policyScripts.set('tenants_admin_access', this.getTenantsPoliciesScript());
  }

  private initializeFunctionScripts(): void {
    // Scripts pré-definidos para funções críticas
    this.functionScripts.set('get_tenant_timezone', this.getTimezoneFunctionsScript());
  }

  // ===============================
  // SCRIPTS PREDEFINIDOS
  // ===============================

  private getTenantsTableScript(): string {
    return `-- Script da tabela tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_timezone_valid CHECK (timezone ~ '^[A-Za-z_]+/[A-Za-z_]+(-[A-Za-z_]+)*$')
);
COMMENT ON TABLE public.tenants IS 'Organizações/clientes do sistema (multi-tenant)';
`;
  }

  private getTenantsIndexesScript(): string {
    return `-- Índices da tabela tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_timezone ON tenants(timezone);
`;
  }

  private getTenantsPoliciesScript(): string {
    return `-- Políticas RLS da tabela tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenants_admin_access ON tenants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.tenant_id = tenants.id 
        AND tur.role IN ('TENANT_ADMIN', 'ADMIN_GLOBAL')
        AND tur.user_id = auth.uid()
    )
  );
`;
  }

  private getTimezoneFunctionsScript(): string {
    return `-- Funções de timezone
CREATE OR REPLACE FUNCTION public.get_tenant_timezone(tenant_uuid UUID)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE AS $$
  SELECT timezone FROM public.tenants WHERE id = tenant_uuid;
$$;

CREATE OR REPLACE FUNCTION public.timesheet_deadline(
  periodo_ini date, 
  tenant_uuid UUID DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE sql
STABLE AS $$
  SELECT (date_trunc('month', periodo_ini)::date + interval '1 month + 4 days')::timestamptz
  AT TIME ZONE COALESCE(
    CASE 
      WHEN tenant_uuid IS NOT NULL THEN public.get_tenant_timezone(tenant_uuid)
      ELSE 'America/Sao_Paulo'
    END,
    'UTC'
  );
$$;
`;
  }
}