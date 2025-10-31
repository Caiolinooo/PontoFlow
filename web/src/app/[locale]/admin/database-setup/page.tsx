/**
 * Database Setup Administration Page
 * 
 * Página administrativa para gerenciamento do sistema de validação
 * Permite configurar, validar e otimizar o banco de dados
 * Timesheet Manager - ABZ Group
 */

import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import DatabaseSetupClient from './DatabaseSetupClient';

export default async function DatabaseSetupPage(props: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await props.params;
  const user = await requireRole(locale, ['ADMIN']);

  const t = await getTranslations({ namespace: 'adminDatabaseSetup' });

  const supabase = await getServerSupabase();

  // Verificar se o banco está acessível
  let dbStatus = null;
  let error = null;

  try {
    // Teste básico de conexão
    const { data, error: dbError } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (!dbError) {
      // Se chegou aqui, conexão está OK
      dbStatus = 'connected';
    }

  } catch (err) {
    dbStatus = 'error';
    error = 'Erro de conexão com o banco de dados';
  }

  // Verificar status inicial (apenas básico)
  let initialStatus = null;
  if (dbStatus === 'connected') {
    try {
      const { data: statusData } = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/database/setup`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }).then(res => res.json()).catch(() => null);

      initialStatus = statusData?.data || null;
    } catch (err) {
      // Silenciar erro - será verificado pelo cliente
      initialStatus = null;
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {t('subtitle')}
          </p>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center space-x-2">
          {dbStatus === 'connected' ? (
            <span className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Banco Conectado
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Erro de Conexão
            </span>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Problema de Conexão
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t('info.title')}
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              {t('info.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      {initialStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Score Geral
                </p>
                <p className={`text-2xl font-bold ${
                  initialStatus.score >= 90 ? 'text-green-600' :
                  initialStatus.score >= 75 ? 'text-blue-600' :
                  initialStatus.score >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {initialStatus.score}%
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                initialStatus.score >= 90 ? 'bg-green-100 dark:bg-green-900' :
                initialStatus.score >= 75 ? 'bg-blue-100 dark:bg-blue-900' :
                initialStatus.score >= 50 ? 'bg-yellow-100 dark:bg-yellow-900' :
                'bg-red-100 dark:bg-red-900'
              }`}>
                <svg className={`w-5 h-5 ${
                  initialStatus.score >= 90 ? 'text-green-600 dark:text-green-400' :
                  initialStatus.score >= 75 ? 'text-blue-600 dark:text-blue-400' :
                  initialStatus.score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tabelas
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {initialStatus.summary?.validTables || 0}/{initialStatus.summary?.totalTables || 17}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Performance
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {initialStatus.summary?.validIndexes || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Segurança
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {initialStatus.summary?.validPolicies || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Client Component */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <DatabaseSetupClient 
          locale={locale} 
          initialStatus={initialStatus}
          dbConnected={dbStatus === 'connected'}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('quickActions.validate.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('quickActions.validate.description')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {t('quickActions.validate.time')} ~30s
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('quickActions.backup.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('quickActions.backup.description')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {t('quickActions.backup.time')} ~2-5min
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            {t('quickActions.optimize.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('quickActions.optimize.description')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {t('quickActions.optimize.time')} ~1-3min
          </p>
        </div>
      </div>

      {/* System Information */}
      <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
        <p>{t('footer.version')} v1.0.0 | {t('footer.lastUpdate')} {new Date().toLocaleDateString('pt-BR')}</p>
        <p className="mt-1">{t('footer.environment')} {process.env.NODE_ENV || 'development'}</p>
      </div>
    </div>
  );
}