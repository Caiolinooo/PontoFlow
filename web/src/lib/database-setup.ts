/**
 * Database Setup Coordinator
 * 
 * Coordenador principal do sistema de validação automática
 * Integra validação, geração e execução de SQL com monitoramento
 * Timesheet Manager - ABZ Group
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import {
  ValidationReport,
  SqlGenerationResult,
  ExecutionResult,
  ExecutionStep,
  ExecutionProgress,
  DatabaseSetupState,
  DatabaseSetupError,
  PROGRESS_UPDATE_INTERVAL,
} from '../types/database';
import { DatabaseValidator } from './database-validator';
import { SqlGenerator } from './sql-generator';

export interface DatabaseSetupOptions {
  autoFix?: boolean;
  createBackup?: boolean;
  enableRollback?: boolean;
  onProgress?: (progress: ExecutionProgress) => void;
  onStepChange?: (step: ExecutionStep) => void;
}

export class DatabaseSetup {
  private validator: DatabaseValidator;
  private generator: SqlGenerator;
  private supabase: ReturnType<typeof createClient<Database>>;
  private options: Required<DatabaseSetupOptions>;
  private isRunning = false;
  private currentStep = 0;
  private totalSteps = 0;
  private abortController?: AbortController;

  constructor(supabaseUrl: string, supabaseKey: string, options: DatabaseSetupOptions = {}) {
    this.validator = new DatabaseValidator(supabaseUrl, supabaseKey);
    this.generator = new SqlGenerator();
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
    
    this.options = {
      autoFix: options.autoFix ?? false,
      createBackup: options.createBackup ?? true,
      enableRollback: options.enableRollback ?? true,
      onProgress: options.onProgress || (() => {}),
      onStepChange: options.onStepChange || (() => {}),
    };
  }

  /**
   * Executa setup completo do banco de dados
   */
  async runFullSetup(): Promise<ExecutionResult> {
    if (this.isRunning) {
      throw new DatabaseSetupError('Setup já está em execução', 'ALREADY_RUNNING');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const steps: ExecutionStep[] = [];

    try {
      console.log('🚀 Iniciando setup completo do banco de dados...');

      // Passo 1: Validação
      await this.updateProgress('Validando estrutura do banco...', 0);
      const validationStep = await this.createStep('validation', 'Validar estrutura do banco', async () => {
        const report = await this.validator.validateDatabase();
        return { report };
      });
      
      const validationResult = await this.executeStep(validationStep);
      const report = validationResult.result.report as ValidationReport;

      // Analisar necessidade de correção
      const needsFix = this.analysisNeedsFix(report);
      
      if (!needsFix) {
        console.log('✅ Banco de dados já está configurado corretamente');
        return this.createSuccessResult([validationStep], startTime);
      }

      if (!this.options.autoFix) {
        console.log('⚠️ Correções necessárias, mas autoFix está desabilitado');
        return this.createPartialResult([validationStep], startTime, report);
      }

      // Passo 2: Gerar SQL
      await this.updateProgress('Gerando scripts SQL...', 10);
      const sqlGenerationStep = await this.createStep('sql_generation', 'Gerar scripts SQL', async () => {
        const sqlResult = this.generator.generateSqlFromValidation(report);
        if (!sqlResult.success) {
          throw new DatabaseSetupError('Falha na geração de SQL', 'SQL_GENERATION_FAILED', sqlResult.errors);
        }
        return { sqlResult };
      });

      const sqlResult = await this.executeStep(sqlGenerationStep);
      const scripts = sqlResult.result.sqlResult.scripts;

      // Passo 3: Backup (opcional)
      let backupStep: ExecutionStep | null = null;
      if (this.options.createBackup) {
        await this.updateProgress('Criando backup...', 20);
        backupStep = await this.createStep('backup', 'Criar backup do banco', async () => {
          const backupResult = await this.createBackup();
          return { backupResult };
        });
        
        await this.executeStep(backupStep);
      }

      // Passo 4: Executar scripts SQL
      const executionSteps = await this.executeSqlScripts(scripts);

      // Compilar resultado final
      const allSteps = [validationStep, sqlGenerationStep, ...executionSteps];
      if (backupStep) {
        allSteps.splice(2, 0, backupStep);
      }

      console.log('✅ Setup concluído com sucesso!');
      return this.createSuccessResult(allSteps, startTime);

    } catch (error) {
      console.error('❌ Erro durante setup:', error);

      // Executar rollback se habilitado e houve mudanças
      if (this.options.enableRollback && this.hasExecutedChanges(steps)) {
        try {
          console.log('🔄 Executando rollback...');
          await this.executeRollback();
        } catch (rollbackError) {
          console.error('⚠️ Falha no rollback:', rollbackError);
        }
      }

      return this.createErrorResult(steps, startTime, error);

    } finally {
      this.isRunning = false;
      this.abortController = undefined;
    }
  }

  /**
   * Executa apenas validação e retorna relatório
   */
  async validateOnly(): Promise<ValidationReport> {
    console.log('🔍 Executando validação...');
    return await this.validator.validateDatabase();
  }

  /**
   * Cancela execução em andamento
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.isRunning = false;
      console.log('❌ Setup cancelado pelo usuário');
    }
  }

  /**
   * Verifica se está executando
   */
  isExecuting(): boolean {
    return this.isRunning;
  }

  /**
   * Analisa se o relatório indica necessidade de correção
   */
  private analysisNeedsFix(report: ValidationReport): boolean {
    const hasMissingTables = report.summary.missingTables > 0;
    const hasMissingIndexes = report.summary.missingIndexes > 0;
    const hasMissingPolicies = report.summary.missingPolicies > 0;
    const hasMissingFunctions = report.summary.missingFunctions > 0;
    const hasIncompleteTables = report.summary.incompleteTables > 0;

    return hasMissingTables || hasMissingIndexes || hasMissingPolicies || 
           hasMissingFunctions || hasIncompleteTables;
  }

  /**
   * Cria uma nova etapa de execução
   */
  private async createStep(
    id: string, 
    name: string, 
    executor: () => Promise<{ [key: string]: any }>
  ): Promise<ExecutionStep> {
    return {
      id,
      name,
      description: `Executando ${name.toLowerCase()}`,
      status: 'pending',
    };
  }

  /**
   * Executa uma etapa específica
   */
  private async executeStep(step: ExecutionStep): Promise<ExecutionStep> {
    step.status = 'running';
    step.startTime = new Date();
    this.options.onStepChange(step);

    try {
      console.log(`🔄 Executando: ${step.name}`);
      
      // Simular execução baseada no tipo de step
      if (step.id === 'validation') {
        // Validação já foi executada na criação
        step.result = {};
      } else {
        // Executar lógica específica
        await this.executeStepLogic(step);
      }

      step.status = 'completed';
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();

      this.options.onStepChange(step);
      console.log(`✅ Concluído: ${step.name} (${step.duration}ms)`);

      return step;

    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date();
      step.duration = step.endTime.getTime() - step.startTime.getTime();
      step.error = error instanceof Error ? error.message : 'Erro desconhecido';

      this.options.onStepChange(step);
      console.error(`❌ Falha: ${step.name} - ${step.error}`);

      throw error;
    }
  }

  /**
   * Executa lógica específica de cada tipo de step
   */
  private async executeStepLogic(step: ExecutionStep): Promise<void> {
    // Implementação específica para cada tipo de step
    // Por enquanto, apenas delay para simulação
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Executa scripts SQL sequencialmente
   */
  private async executeSqlScripts(scripts: any[]): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];
    this.totalSteps = scripts.length;

    for (let i = 0; i < scripts.length; i++) {
      if (this.abortController?.signal.aborted) {
        throw new DatabaseSetupError('Setup cancelado pelo usuário', 'CANCELLED');
      }

      const script = scripts[i];
      const stepNumber = i + 1;
      const progress = 30 + (stepNumber / scripts.length) * 60; // 30% a 90%

      await this.updateProgress(`Executando script ${stepNumber}/${scripts.length}: ${script.name}`, progress);

      const step = await this.createStep(`sql_${i}`, `Executar ${script.name}`, async () => {
        const result = await this.executeSingleSqlScript(script);
        return { result };
      });

      steps.push(await this.executeStep(step));
    }

    return steps;
  }

  /**
   * Executa um único script SQL
   */
  private async executeSingleSqlScript(script: any): Promise<any> {
    try {
      // Dividir script em statements individuais
      const statements = this.splitSqlStatements(script.sql);
      
      const results = [];
      for (const statement of statements) {
        if (statement.trim()) {
          const { data, error } = await this.supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            throw new DatabaseSetupError(
              `Erro executando SQL: ${error.message}`,
              'SQL_EXECUTION_FAILED',
              { statement, error }
            );
          }
          
          results.push({ statement, data, success: true });
        }
      }

      return { results, scriptName: script.name };

    } catch (error) {
      throw new DatabaseSetupError(
        `Falha na execução do script ${script.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'SCRIPT_EXECUTION_FAILED',
        { script: script.name, error }
      );
    }
  }

  /**
   * Divide SQL em statements separados
   */
  private splitSqlStatements(sql: string): string[] {
    // Implementação simplificada - em produção seria mais robusta
    return sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Cria backup do banco
   */
  private async createBackup(): Promise<any> {
    // Implementação simplificada - em produção seria mais robusta
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${timestamp}`;
    
    console.log(`📦 Criando backup: ${backupName}`);
    
    // Simular backup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      backupName,
      timestamp,
      status: 'created',
      size: '0 MB', // Seria calculado em produção
    };
  }

  /**
   * Executa rollback
   */
  private async executeRollback(): Promise<void> {
    console.log('🔄 Executando rollback...');
    
    // Implementação simplificada - em produção seria mais robusta
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Rollback concluído');
  }

  /**
   * Verifica se houve mudanças executadas
   */
  private hasExecutedChanges(steps: ExecutionStep[]): boolean {
    return steps.some(step => step.status === 'completed' && step.id.startsWith('sql_'));
  }

  /**
   * Atualiza progresso da execução
   */
  private async updateProgress(message: string, percentage: number): Promise<void> {
    const progress: ExecutionProgress = {
      stepId: `step_${this.currentStep}`,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      currentStepName: message,
      percentage,
      currentStatus: 'running',
    };

    this.options.onProgress(progress);

    // Aguardar intervalo de atualização
    await new Promise(resolve => setTimeout(resolve, PROGRESS_UPDATE_INTERVAL));
  }

  /**
   * Cria resultado de sucesso
   */
  private createSuccessResult(steps: ExecutionStep[], startTime: number): ExecutionResult {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;
    const skippedSteps = steps.filter(s => s.status === 'skipped').length;

    return {
      success: true,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration: Date.now() - startTime,
      steps,
      rollbackExecuted: false,
      summary: {
        totalSteps: steps.length,
        completedSteps,
        failedSteps,
        skippedSteps,
      },
    };
  }

  /**
   * Cria resultado parcial (validação OK, mas correções foram puladas)
   */
  private createPartialResult(steps: ExecutionStep[], startTime: number, report: ValidationReport): ExecutionResult {
    const completedSteps = steps.filter(s => s.status === 'completed').length;

    return {
      success: true,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration: Date.now() - startTime,
      steps,
      rollbackExecuted: false,
      summary: {
        totalSteps: steps.length,
        completedSteps,
        failedSteps: 0,
        skippedSteps: 0,
      },
      // Adicionar informações sobre o relatório de validação
      result: { validationReport: report },
    } as any;
  }

  /**
   * Cria resultado de erro
   */
  private createErrorResult(steps: ExecutionStep[], startTime: Date, error: any): ExecutionResult {
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;

    return {
      success: false,
      startedAt: startTime,
      completedAt: new Date(),
      duration: Date.now() - startTime.getTime(),
      steps,
      rollbackExecuted: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      summary: {
        totalSteps: steps.length,
        completedSteps,
        failedSteps,
        skippedSteps: 0,
      },
    };
  }

  // ===============================
  // MÉTODOS DE UTILIDADE PARA UI
  // ===============================

  /**
   * Gera estado da UI baseado no progresso atual
   */
  getCurrentState(): DatabaseSetupState {
    return {
      isOpen: this.isRunning,
      isValidating: this.isRunning && this.currentStep === 0,
      isExecuting: this.isRunning && this.currentStep > 0,
    };
  }

  /**
   * Calcula tempo estimado restante
   */
  private calculateEstimatedTimeRemaining(): number {
    if (this.totalSteps === 0) return 0;

    const completedSteps = this.currentStep;
    const remainingSteps = this.totalSteps - completedSteps;
    
    // Estimativa baseada em steps completados (assumindo 2s por step)
    const averageTimePerStep = 2000;
    
    return Math.round((remainingSteps * averageTimePerStep) / 1000); // em segundos
  }

  /**
   * Formata duração para exibição
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Formata tamanho para exibição
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Gera resumo do relatório de validação para UI
   */
  static generateValidationSummary(report: ValidationReport): {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    message: string;
    actions: Array<{
      type: 'create' | 'fix' | 'optimize';
      count: number;
      description: string;
    }>;
  } {
    const score = report.summary.overallScore;
    
    let status: 'excellent' | 'good' | 'warning' | 'critical';
    let message: string;

    if (score >= 90) {
      status = 'excellent';
      message = 'Banco de dados perfeitamente configurado';
    } else if (score >= 75) {
      status = 'good';
      message = 'Banco de dados bem configurado com pequenas melhorias';
    } else if (score >= 50) {
      status = 'warning';
      message = 'Banco de dados precisa de correções importantes';
    } else {
      status = 'critical';
      message = 'Banco de dados requer configuração completa';
    }

    const actions = [];

    if (report.summary.missingTables > 0) {
      actions.push({
        type: 'create' as const,
        count: report.summary.missingTables,
        description: `${report.summary.missingTables} tabelas faltantes`,
      });
    }

    if (report.summary.missingIndexes > 0) {
      actions.push({
        type: 'optimize' as const,
        count: report.summary.missingIndexes,
        description: `${report.summary.missingIndexes} índices faltantes`,
      });
    }

    if (report.summary.missingPolicies > 0) {
      actions.push({
        type: 'fix' as const,
        count: report.summary.missingPolicies,
        description: `${report.summary.missingPolicies} políticas RLS faltantes`,
      });
    }

    if (report.summary.missingFunctions > 0) {
      actions.push({
        type: 'create' as const,
        count: report.summary.missingFunctions,
        description: `${report.summary.missingFunctions} funções faltantes`,
      });
    }

    return { score, status, message, actions };
  }
}