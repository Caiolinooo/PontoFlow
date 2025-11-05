/**
 * Database Setup Client Component
 * 
 * Componente cliente que integra com a API e fornece interface
 * para validação e configuração automática do banco de dados
 * Timesheet Manager - ABZ Group
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDatabaseSetup } from '@/hooks/useDatabaseSetup';
import DatabaseSetupModal from '@/components/DatabaseSetup';
import SetupWizardModal from '@/components/setup-wizard/SetupWizardModal';
// Removed DatabaseStatusIndicator import

interface DatabaseSetupClientProps {
  locale: string;
  initialStatus?: any;
  dbConnected: boolean;
}

export default function DatabaseSetupClient({ 
  locale, 
  initialStatus, 
  dbConnected 
}: DatabaseSetupClientProps) {
  const {
    state,
    validationReport,
    executionResult,
    progress,
    error,
    isLoading,
    openModal,
    closeModal,
    runValidation,
    runSetup,
    cancelExecution,
    getStatusMessage,
    getEstimatedTime,
    formatDuration,
    reset,
  } = useDatabaseSetup();

  // Estados locais
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'setup' | 'logs'>('overview');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAutoCheck, setIsAutoCheck] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);

  // Adicionar log
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Inicialização
  useEffect(() => {
    if (initialStatus) {
      addLog(`Status inicial: Score ${initialStatus.score}%`);
    }
    if (dbConnected) {
      addLog('Conexão com banco estabelecida');
    } else {
      addLog('Erro de conexão com banco');
    }
  }, [initialStatus, dbConnected, addLog]);

  // Handlers para ações
  const handleValidate = useCallback(async () => {
    addLog('🔍 Iniciando validação...');
    try {
      await runValidation();
      addLog('✅ Validação concluída');
    } catch (err) {
      addLog(`❌ Erro na validação: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }, [runValidation, addLog]);

  const handleSetup = useCallback(async () => {
    addLog('🚀 Iniciando setup completo...');
    try {
      await runSetup({
        autoFix: true,
        createBackup: true,
        enableRollback: true,
      });
      addLog('✅ Setup concluído com sucesso');
    } catch (err) {
      addLog(`❌ Erro no setup: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  }, [runSetup, addLog]);

  const handleQuickValidate = useCallback(() => {
    openModal();
    // O modal automaticamente executará a validação
  }, [openModal]);

  const handleWizard = useCallback(() => {
    setShowWizardModal(true);
    addLog('🧙 Abrindo Setup Wizard...');
  }, [addLog]);

  // Auto-check periódico
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAutoCheck) {
      interval = setInterval(() => {
        if (!state.isExecuting && !state.isValidating) {
          runValidation().catch(() => {}); // Silenciar erros no auto-check
        }
      }, 60000); // A cada minuto
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAutoCheck, state.isExecuting, state.isValidating, runValidation]);

  // Se banco não está conectado, mostrar mensagem
  if (!dbConnected) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Conexão com Banco Indisponível
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Não foi possível conectar ao banco de dados. Verifique as configurações.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              dbConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {dbConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          {state.isValidating && (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm">Validando...</span>
            </div>
          )}
          {state.isExecuting && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-sm">Executando...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isAutoCheck}
              onChange={(e) => setIsAutoCheck(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Auto-verificação
            </span>
          </label>

          <button
            onClick={handleQuickValidate}
            disabled={state.isExecuting || state.isValidating}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50"
          >
            Validação Rápida
          </button>

          <button
            onClick={handleValidate}
            disabled={state.isExecuting || state.isValidating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Validar Completo
          </button>

          <button
            onClick={handleWizard}
            disabled={state.isExecuting || state.isValidating}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Setup Wizard
          </button>

          <button
            onClick={openModal}
            disabled={state.isExecuting || state.isValidating}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Abrir Setup
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Visão Geral', icon: '📊' },
            { id: 'validation', label: 'Validação', icon: '🔍' },
            { id: 'setup', label: 'Configuração', icon: '⚙️' },
            { id: 'logs', label: 'Logs', icon: '📝' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content das tabs */}
      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {validationReport ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score e Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Status Geral
                  </h3>
                  
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                    <div className="text-center">
                      <div className={`text-4xl font-bold mb-2 ${
                        validationReport.summary.overallScore >= 90 ? 'text-green-600' :
                        validationReport.summary.overallScore >= 75 ? 'text-blue-600' :
                        validationReport.summary.overallScore >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {validationReport.summary.overallScore}%
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Score de Configuração
                      </p>
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              validationReport.summary.overallScore >= 90 ? 'bg-green-500' :
                              validationReport.summary.overallScore >= 75 ? 'bg-blue-500' :
                              validationReport.summary.overallScore >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${validationReport.summary.overallScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {validationReport.summary.validTables}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        de {validationReport.summary.totalTables} tabelas OK
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {validationReport.summary.validIndexes}
                      </div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        índices de performance
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações Recomendadas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Ações Recomendadas
                  </h3>
                  
                  {validationReport.recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {validationReport.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-sm text-blue-700 dark:text-blue-300">{rec}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        Banco perfeitamente configurado!
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        Nenhuma ação necessária no momento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhum dado de validação disponível
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Execute uma validação para visualizar o status do banco de dados.
                </p>
                <button
                  onClick={handleValidate}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Validando...' : 'Executar Validação'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Relatório de Validação
              </h3>
              <button
                onClick={handleValidate}
                disabled={state.isValidating || state.isExecuting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {state.isValidating ? 'Validando...' : 'Nova Validação'}
              </button>
            </div>

            {validationReport ? (
              <div className="grid grid-cols-1 gap-6">
                {/* Resumo de Tabelas */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                    Tabelas do Banco de Dados
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {validationReport.summary.validTables}
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">Válidas</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {validationReport.summary.missingTables}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300">Faltantes</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {validationReport.summary.incompleteTables}
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300">Incompletas</div>
                    </div>
                  </div>
                </div>

                {/* Erros e Avisos */}
                {(validationReport.errors.length > 0 || validationReport.warnings.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {validationReport.errors.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                        <h4 className="font-medium text-red-800 dark:text-red-200 mb-4">
                          Erros ({validationReport.errors.length})
                        </h4>
                        <div className="space-y-2">
                          {validationReport.errors.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {validationReport.warnings.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-4">
                          Avisos ({validationReport.warnings.length})
                        </h4>
                        <div className="space-y-2">
                          {validationReport.warnings.map((warning, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-sm text-yellow-700 dark:text-yellow-300">{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  Execute uma validação para ver os detalhes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Configuração Automática
              </h3>
              <div className="flex items-center space-x-3">
                {state.isExecuting && (
                  <button
                    onClick={cancelExecution}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Progress */}
            {progress && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    {progress.currentStepName}
                  </h4>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {Math.round(progress.percentage)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-2">
                  <span>Passo {progress.currentStep} de {progress.totalSteps}</span>
                  {progress.estimatedTimeRemaining && (
                    <span>~{Math.round(progress.estimatedTimeRemaining)}s restantes</span>
                  )}
                </div>
              </div>
            )}

            {/* Resultado */}
            {executionResult && (
              <div className={`border rounded-lg p-6 ${
                executionResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center mb-4">
                  {executionResult.success ? (
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <h4 className={`font-medium ${
                    executionResult.success 
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {executionResult.success ? 'Configuração Concluída' : 'Configuração Falhou'}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      executionResult.success 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {executionResult.summary.completedSteps}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Etapas Concluídas</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      executionResult.success 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatDuration(executionResult.duration || 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Tempo Total</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${
                      executionResult.success 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {Math.round((executionResult.summary.completedSteps / executionResult.summary.totalSteps) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Taxa de Sucesso</div>
                  </div>
                </div>

                {executionResult.error && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Erro:</strong> {executionResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleSetup}
                disabled={state.isExecuting || state.isValidating}
                className="p-4 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Setup Completo
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Validar e corrigir tudo automaticamente
                </p>
              </button>

              <button
                onClick={handleWizard}
                disabled={state.isExecuting || state.isValidating}
                className="p-4 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Setup Wizard
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Assistente passo-a-passo para configuração completa
                </p>
              </button>

              <button
                onClick={openModal}
                disabled={state.isExecuting || state.isValidating}
                className="p-4 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  Configuração Guiada
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Modal interativo com validação e ajustes
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Logs de Execução
              </h3>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Limpar
              </button>
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500">
                  Nenhum log disponível. Execute uma operação para ver os logs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Setup */}
      <DatabaseSetupModal
        open={state.isOpen}
        onClose={closeModal}
        onComplete={(result) => {
          addLog('Setup concluído via modal');
          if (result.success) {
            // Refresh status
            runValidation().catch(() => {});
          }
        }}
      />

      {/* Setup Wizard Modal */}
      <SetupWizardModal
        open={showWizardModal}
        onClose={() => {
          setShowWizardModal(false);
          addLog('🧙 Setup Wizard fechado');
        }}
        onComplete={() => {
          addLog('✅ Setup Wizard concluído com sucesso');
          // Refresh status after wizard completion
          runValidation().catch(() => {});
        }}
      />
    </div>
  );
}