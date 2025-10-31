/**
 * useDatabaseSetup Hook
 * 
 * Hook React para integrar o sistema de validação automática
 * Fornece estado, controles e callbacks para o componente modal
 * Timesheet Manager - ABZ Group
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ValidationReport,
  ExecutionResult,
  ExecutionProgress,
  ExecutionStep,
  DatabaseSetupState,
} from '../types/database';
import { DatabaseSetup } from '../lib/database-setup';

export interface UseDatabaseSetupReturn {
  // State
  state: DatabaseSetupState;
  validationReport: ValidationReport | null;
  executionResult: ExecutionResult | null;
  progress: ExecutionProgress | null;
  error: string | null;
  isLoading: boolean;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  runValidation: () => Promise<void>;
  runSetup: (options?: {
    autoFix?: boolean;
    createBackup?: boolean;
    enableRollback?: boolean;
  }) => Promise<void>;
  cancelExecution: () => void;

  // Utility
  getStatusMessage: () => string;
  getEstimatedTime: () => number;
  formatDuration: (ms: number) => string;
  reset: () => void;
}

export function useDatabaseSetup(): UseDatabaseSetupReturn {
  // Estados principais
  const [state, setState] = useState<DatabaseSetupState>({
    isOpen: false,
    isValidating: false,
    isExecuting: false,
  });

  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs e configurações
  const setupInstanceRef = useRef<DatabaseSetup | null>(null);
  const [config, setConfig] = useState({
    autoFix: true,
    createBackup: true,
    enableRollback: true,
  });

  // Inicializar instância do DatabaseSetup (seria configurado com credenciais reais)
  const initializeSetup = useCallback(() => {
    if (!setupInstanceRef.current) {
      // Em produção, obter credenciais do ambiente ou contexto
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      
      setupInstanceRef.current = new DatabaseSetup(supabaseUrl, supabaseKey, {
        autoFix: config.autoFix,
        createBackup: config.createBackup,
        enableRollback: config.enableRollback,
        onProgress: handleProgress,
        onStepChange: handleStepChange,
      });
    }
    return setupInstanceRef.current;
  }, [config]);

  // Handlers para callbacks do DatabaseSetup
  const handleProgress = useCallback((progressData: ExecutionProgress) => {
    setProgress(progressData);
    setState(prev => ({
      ...prev,
      isValidating: progressData.currentStatus === 'running' && progressData.currentStepName.includes('Valid'),
      isExecuting: progressData.currentStatus === 'running' && !progressData.currentStepName.includes('Valid'),
    }));
  }, []);

  const handleStepChange = useCallback((step: ExecutionStep) => {
    console.log(`Step ${step.id} changed to: ${step.status}`);
    
    // Atualizar estado baseado no step atual
    if (step.id === 'validation' && step.status === 'running') {
      setState(prev => ({ ...prev, isValidating: true }));
    } else if (step.id.startsWith('sql_') || step.id === 'backup') {
      setState(prev => ({ ...prev, isExecuting: true }));
    }
  }, []);

  // Ações principais
  const openModal = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }));
    setError(null);
    setExecutionResult(null);
    setProgress(null);
  }, []);

  const closeModal = useCallback(() => {
    // Cancelar execução se estiver rodando
    if (setupInstanceRef.current?.isExecuting()) {
      setupInstanceRef.current.cancel();
    }

    setState(prev => ({ 
      ...prev, 
      isOpen: false, 
      isValidating: false, 
      isExecuting: false 
    }));
    setValidationReport(null);
    setExecutionResult(null);
    setProgress(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const runValidation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setState(prev => ({ ...prev, isValidating: true }));

      const setup = initializeSetup();
      const report = await setup.validateOnly();
      
      setValidationReport(report);
      setState(prev => ({ ...prev, isValidating: false }));
      
      console.log('✅ Validação concluída:', report.summary);

    } catch (err) {
      console.error('❌ Erro na validação:', err);
      setError(err instanceof Error ? err.message : 'Erro na validação');
      setState(prev => ({ ...prev, isValidating: false }));
    } finally {
      setIsLoading(false);
    }
  }, [initializeSetup]);

  const runSetup = useCallback(async (options?: {
    autoFix?: boolean;
    createBackup?: boolean;
    enableRollback?: boolean;
  }) => {
    try {
      // Atualizar configurações se fornecidas
      if (options) {
        setConfig(prev => ({ ...prev, ...options }));
      }

      setIsLoading(true);
      setError(null);
      setState(prev => ({ ...prev, isExecuting: true }));

      const setup = initializeSetup();
      const result = await setup.runFullSetup();
      
      setExecutionResult(result);
      setState(prev => ({ 
        ...prev, 
        isExecuting: false,
        // Manter modal aberto para mostrar resultado
      }));

      console.log('✅ Setup concluído:', result);

      // Callback de sucesso
      if (result.success) {
        // Trigger custom event ou callback
        window.dispatchEvent(new CustomEvent('databaseSetup:completed', { 
          detail: result 
        }));
      }

    } catch (err) {
      console.error('❌ Erro no setup:', err);
      setError(err instanceof Error ? err.message : 'Erro no setup');
      setState(prev => ({ ...prev, isExecuting: false }));
    } finally {
      setIsLoading(false);
    }
  }, [initializeSetup]);

  const cancelExecution = useCallback(() => {
    if (setupInstanceRef.current) {
      setupInstanceRef.current.cancel();
      setState(prev => ({ 
        ...prev, 
        isValidating: false, 
        isExecuting: false 
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setValidationReport(null);
    setExecutionResult(null);
    setProgress(null);
    setError(null);
    setIsLoading(false);
    setState(prev => ({ 
      ...prev, 
      isValidating: false, 
      isExecuting: false 
    }));
  }, []);

  // Utilitários
  const getStatusMessage = useCallback((): string => {
    if (error) {
      return `Erro: ${error}`;
    }
    
    if (executionResult) {
      return executionResult.success 
        ? 'Configuração concluída com sucesso!' 
        : 'Falha na configuração';
    }
    
    if (state.isValidating) {
      return 'Validando estrutura do banco...';
    }
    
    if (state.isExecuting) {
      return progress?.currentStepName || 'Executando configuração...';
    }
    
    if (validationReport) {
      const score = validationReport.summary.overallScore;
      if (score >= 90) return 'Banco de dados perfeito';
      if (score >= 75) return 'Banco bem configurado';
      if (score >= 50) return 'Banco precisa de atenção';
      return 'Banco requer configuração';
    }
    
    return 'Pronto para validação';
  }, [error, executionResult, state.isValidating, state.isExecuting, progress, validationReport]);

  const getEstimatedTime = useCallback((): number => {
    if (state.isExecuting && progress?.estimatedTimeRemaining) {
      return progress.estimatedTimeRemaining;
    }
    
    // Estimativa baseada no relatório de validação
    if (validationReport) {
      const totalIssues = 
        validationReport.summary.missingTables +
        validationReport.summary.missingIndexes +
        validationReport.summary.missingPolicies +
        validationReport.summary.missingFunctions;
      
      // Estimativa: ~2 segundos por issue
      return Math.max(10, totalIssues * 2);
    }
    
    return 30; // Estimativa padrão
  }, [state.isExecuting, progress, validationReport]);

  const formatDuration = useCallback((milliseconds: number): string => {
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
  }, []);

  return {
    // State
    state,
    validationReport,
    executionResult,
    progress,
    error,
    isLoading,

    // Actions
    openModal,
    closeModal,
    runValidation,
    runSetup,
    cancelExecution,

    // Utility
    getStatusMessage,
    getEstimatedTime,
    formatDuration,
    reset,
  };
}

// ===============================
// HOOKS AUXILIARES
// ===============================

/**
 * Hook para verificar status do banco de dados
 */
export function useDatabaseStatus() {
  const { validationReport, runValidation } = useDatabaseSetup();
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      await runValidation();
    } finally {
      setIsChecking(false);
    }
  }, [runValidation]);

  const getStatusInfo = useCallback(() => {
    if (!validationReport) {
      return {
        status: 'unknown' as const,
        score: 0,
        message: 'Status desconhecido',
        needsAttention: false,
      };
    }

    const score = validationReport.summary.overallScore;
    const needsAttention = score < 90;

    let status: 'excellent' | 'good' | 'warning' | 'critical';
    let message: string;

    if (score >= 90) {
      status = 'excellent';
      message = 'Perfeito';
    } else if (score >= 75) {
      status = 'good';
      message = 'Bom';
    } else if (score >= 50) {
      status = 'warning';
      message = 'Atenção';
    } else {
      status = 'critical';
      message = 'Crítico';
    }

    return {
      status,
      score,
      message,
      needsAttention,
      summary: validationReport.summary,
    };
  }, [validationReport]);

  return {
    status: validationReport ? getStatusInfo() : null,
    checkStatus,
    isChecking,
  };
}

/**
 * Hook para integração com notificações
 */
export function useDatabaseNotifications() {
  const { executionResult, validationReport } = useDatabaseSetup();

  const getNotificationMessage = useCallback(() => {
    if (executionResult?.success) {
      return {
        type: 'success' as const,
        title: 'Configuração Concluída',
        message: `Banco configurado com sucesso em ${formatDuration(executionResult.duration!)}`,
      };
    }

    if (validationReport?.summary.overallScore < 50) {
      return {
        type: 'warning' as const,
        title: 'Banco Requer Atenção',
        message: `Score: ${validationReport.summary.overallScore}%. Configure o banco para melhor performance.`,
      };
    }

    return null;
  }, [executionResult, validationReport, formatDuration]);

  return {
    notification: getNotificationMessage(),
  };
}

// Export the main hook for convenience
export { useDatabaseSetup as default };

// ===============================
// COMPONENTES AUXILIARES
// ===============================

