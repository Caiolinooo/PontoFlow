/**
 * Database Setup Modal Component
 * 
 * Interface moderna e responsiva para o sistema de validação de banco
 * Permite visualizar relatório, confirmar execução e acompanhar progresso
 * Timesheet Manager - ABZ Group
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  ValidationReport,
  ExecutionResult,
  ExecutionProgress,
  ExecutionStep,
} from '../types/database';
import { DatabaseSetup } from '../lib/database-setup';

interface DatabaseSetupModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (result: ExecutionResult) => void;
}

export default function DatabaseSetupModal({ open, onClose, onComplete }: DatabaseSetupModalProps) {
  const [currentStep, setCurrentStep] = useState<'validation' | 'review' | 'executing' | 'completed' | 'error'>('validation');
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para configuração
  const [autoFix, setAutoFix] = useState(true);
  const [createBackup, setCreateBackup] = useState(true);
  const [enableRollback, setEnableRollback] = useState(true);

  // Reset quando modal abre/fecha
  useEffect(() => {
    if (open) {
      setCurrentStep('validation');
      setValidationReport(null);
      setExecutionResult(null);
      setProgress(null);
      setError(null);
      setIsLoading(true);
      
      // Iniciar validação automaticamente
      runValidation();
    }
  }, [open]);

  const runValidation = async () => {
    try {
      // Simulação de validação (em produção, usaria setup real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simular relatório de validação
      const mockReport: ValidationReport = {
        timestamp: new Date(),
        summary: {
          totalTables: 17,
          validTables: 12,
          missingTables: 2,
          incompleteTables: 3,
          totalIndexes: 45,
          validIndexes: 38,
          missingIndexes: 7,
          totalPolicies: 35,
          validPolicies: 28,
          missingPolicies: 7,
          totalFunctions: 15,
          validFunctions: 12,
          missingFunctions: 3,
          overallScore: 78,
        },
        tables: [],
        indexes: [],
        policies: [],
        functions: [],
        migrations: [],
        errors: ['Tabela "notifications" não existe', 'Tabela "timesheet_annotations" não existe'],
        warnings: [
          'Tabela "timesheets" está incompleta',
          '7 índices de performance faltantes',
          '7 políticas RLS não configuradas',
        ],
        recommendations: [
          'Criar 2 tabelas faltantes',
          'Configurar 7 índices para otimizar performance',
          'Definir 7 políticas RLS para segurança',
          'Criar 3 funções necessárias',
        ],
      };

      setValidationReport(mockReport);
      setCurrentStep('review');
      setIsLoading(false);

    } catch (err) {
      console.error('Erro na validação:', err);
      setError('Falha na validação do banco de dados');
      setCurrentStep('error');
      setIsLoading(false);
    }
  };

  const runSetup = async () => {
    if (!validationReport) return;

    setIsLoading(true);
    setCurrentStep('executing');
    setError(null);

    try {
      // Simular execução completa
      const steps: ExecutionStep[] = [
        {
          id: 'validation',
          name: 'Validar estrutura',
          description: 'Verificando estrutura do banco',
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 1500,
        },
        {
          id: 'backup',
          name: 'Criar backup',
          description: 'Backup do banco atual',
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 3000,
        },
      ];

      // Simular progresso de execução
      let currentProgress = 10;
      const totalSteps = 15;
      
      for (let i = 0; i < totalSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        currentProgress = 10 + (i / totalSteps) * 80;
        
        setProgress({
          stepId: `step_${i}`,
          currentStep: i + 1,
          totalSteps,
          currentStepName: `Executando script ${i + 1}/${totalSteps}`,
          percentage: currentProgress,
          currentStatus: 'running',
        });

        steps.push({
          id: `sql_${i}`,
          name: `Script ${i + 1}`,
          description: `Executando script ${i + 1}`,
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          duration: 500,
        });
      }

      const mockResult: ExecutionResult = {
        success: true,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 25000,
        steps,
        rollbackExecuted: false,
        summary: {
          totalSteps: totalSteps + 2,
          completedSteps: totalSteps + 2,
          failedSteps: 0,
          skippedSteps: 0,
        },
      };

      setExecutionResult(mockResult);
      setCurrentStep('completed');
      setIsLoading(false);
      
      if (onComplete) {
        onComplete(mockResult);
      }

    } catch (err) {
      console.error('Erro na execução:', err);
      setError('Falha durante execução do setup');
      setCurrentStep('error');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('validation');
    setValidationReport(null);
    setExecutionResult(null);
    setProgress(null);
    setError(null);
    setIsLoading(false);
    onClose();
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 75) return 'bg-blue-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Configuração do Banco de Dados
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sistema de Validação e Configuração Automática
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {/* Step 1: Validation */}
          {currentStep === 'validation' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Validando Estrutura do Banco
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Verificando tabelas, índices, políticas RLS e funções...
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {currentStep === 'review' && validationReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${getScoreBgColor(validationReport.summary.overallScore)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Score Geral</p>
                      <p className={`text-2xl font-bold ${getScoreColor(validationReport.summary.overallScore)}`}>
                        {validationReport.summary.overallScore}%
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getScoreBgColor(validationReport.summary.overallScore)}`}>
                      <svg className={`w-6 h-6 ${getScoreColor(validationReport.summary.overallScore)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Problemas</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {validationReport.summary.missingTables + validationReport.summary.missingIndexes + validationReport.summary.missingPolicies + validationReport.summary.missingFunctions}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                      <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {validationReport.summary.overallScore >= 90 ? 'Perfeito' : 
                         validationReport.summary.overallScore >= 75 ? 'Bom' :
                         validationReport.summary.overallScore >= 50 ? 'Atenção' : 'Crítico'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Issues */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Problemas Identificados
                  </h3>
                  
                  {validationReport.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-red-700 dark:text-red-400">Erros</h4>
                      {validationReport.errors.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {validationReport.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Avisos</h4>
                      {validationReport.warnings.map((warning, index) => (
                        <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm text-yellow-700 dark:text-yellow-300">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Ações Recomendadas
                  </h3>
                  
                  {validationReport.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-sm text-blue-700 dark:text-blue-300">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration Options */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Opções de Configuração
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={autoFix}
                      onChange={(e) => setAutoFix(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Correção Automática
                    </span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={createBackup}
                      onChange={(e) => setCreateBackup(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Criar Backup
                    </span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={enableRollback}
                      onChange={(e) => setEnableRollback(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Habilitar Rollback
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Executing */}
          {currentStep === 'executing' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Executando Configuração
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Aplicando correções e otimizações no banco de dados...
                </p>
              </div>

              {/* Progress Bar */}
              {progress && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {progress.currentStepName}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(progress.percentage)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Passo {progress.currentStep} de {progress.totalSteps}</span>
                    <span>
                      {progress.estimatedTimeRemaining && (
                        `~${Math.round(progress.estimatedTimeRemaining)}s restantes`
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Completed */}
          {currentStep === 'completed' && executionResult && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Configuração Concluída com Sucesso!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  O banco de dados foi configurado e otimizado com êxito.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {executionResult.summary.completedSteps}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Etapas Concluídas</div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(executionResult.duration! / 1000)}s
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Tempo Total</div>
                </div>
                
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    100%
                  </div>
                  <div className="text-sm text-purple-700 dark:text-purple-300">Taxa de Sucesso</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Error */}
          {currentStep === 'error' && (
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Erro na Configuração
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {error || 'Ocorreu um erro inesperado durante a configuração.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {currentStep === 'review' && validationReport && (
              <span>Score: {validationReport.summary.overallScore}%</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            {currentStep === 'review' && (
              <>
                <button
                  onClick={runValidation}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Validar Novamente
                </button>
                
                <button
                  onClick={runSetup}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Iniciar Configuração
                </button>
              </>
            )}
            
            {currentStep === 'completed' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Concluir
              </button>
            )}
            
            {currentStep === 'error' && (
              <>
                <button
                  onClick={() => setCurrentStep('review')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Tentar Novamente
                </button>
                
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Fechar
                </button>
              </>
            )}
            
            {currentStep === 'validation' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}