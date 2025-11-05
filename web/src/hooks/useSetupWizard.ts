/**
 * Setup Wizard Hook
 * 
 * Custom hook for managing database setup wizard state and API interactions
 * Integrates with Phase 3 backend API endpoints
 * Timesheet Manager - ABZ Group
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  WizardProgress,
  WizardLayer,
  WizardExecutionOptions,
  WizardExecutionResult,
  DryRunResult,
} from '../types/database';

interface WizardApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface WizardState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  progress: WizardProgress | null;
  currentLayer: number;
  executionResult: WizardExecutionResult | null;
  dryRunResult: DryRunResult | null;
}

export interface WizardActions {
  initializeWizard: () => Promise<void>;
  executeLayer: (options: WizardExecutionOptions) => Promise<WizardExecutionResult | null>;
  runDryRun: (layer: number) => Promise<DryRunResult | null>;
  validateDatabase: () => Promise<any>;
  getProgress: () => Promise<WizardProgress | null>;
  executeRollback: (confirmToken: string) => Promise<boolean>;
  clearError: () => void;
  resetWizard: () => void;
}

export function useSetupWizard(): WizardState & WizardActions {
  const [state, setState] = useState<WizardState>({
    initialized: false,
    loading: false,
    error: null,
    progress: null,
    currentLayer: 0,
    executionResult: null,
    dryRunResult: null,
  });

  // API call helper
  const apiCall = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data: WizardApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `API call failed: ${response.status}`);
    }

    return data.data;
  }, []);

  // Initialize wizard
  const initializeWizard = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const progress = await apiCall<WizardProgress>('/api/admin/database/setup-wizard', {
        method: 'POST',
        body: JSON.stringify({ action: 'initialize' }),
      });

      setState(prev => ({
        ...prev,
        initialized: true,
        loading: false,
        progress,
        currentLayer: 0,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize wizard';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, [apiCall]);

  // Execute a specific layer
  const executeLayer = useCallback(async (options: WizardExecutionOptions): Promise<WizardExecutionResult | null> => {
    setState(prev => ({ ...prev, loading: true, error: null, executionResult: null }));
    
    try {
      const result = await apiCall<WizardExecutionResult>('/api/admin/database/setup-wizard', {
        method: 'POST',
        body: JSON.stringify({
          action: 'execute',
          options,
        }),
      });

      setState(prev => ({
        ...prev,
        loading: false,
        executionResult: result,
        currentLayer: result.layer,
      }));

      // Refresh progress after execution
      await getProgress();
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute layer';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [apiCall]);

  // Run dry run for a layer
  const runDryRun = useCallback(async (layer: number): Promise<DryRunResult | null> => {
    setState(prev => ({ ...prev, loading: true, error: null, dryRunResult: null }));
    
    try {
      const result = await apiCall<DryRunResult>('/api/admin/database/setup-wizard', {
        method: 'POST',
        body: JSON.stringify({
          action: 'dry-run',
          options: { layer },
        }),
      });

      setState(prev => ({
        ...prev,
        loading: false,
        dryRunResult: result,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run dry run';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [apiCall]);

  // Validate database
  const validateDatabase = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall('/api/admin/database/setup-wizard', {
        method: 'POST',
        body: JSON.stringify({ action: 'validate' }),
      });

      setState(prev => ({ ...prev, loading: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [apiCall]);

  // Get current progress
  const getProgress = useCallback(async (): Promise<WizardProgress | null> => {
    try {
      const progress = await apiCall<WizardProgress>('/api/admin/database/setup-wizard/progress', {
        method: 'GET',
      });

      setState(prev => ({ ...prev, progress }));
      return progress;
    } catch (error) {
      console.error('Failed to get progress:', error);
      return null;
    }
  }, [apiCall]);

  // Execute rollback
  const executeRollback = useCallback(async (confirmToken: string): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall('/api/admin/database/setup-wizard/rollback', {
        method: 'POST',
        body: JSON.stringify({
          confirmToken,
          createBackup: true,
        }),
      });

      setState(prev => ({
        ...prev,
        loading: false,
        initialized: false,
        progress: null,
        currentLayer: 0,
        executionResult: null,
        dryRunResult: null,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rollback failed';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [apiCall]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setState({
      initialized: false,
      loading: false,
      error: null,
      progress: null,
      currentLayer: 0,
      executionResult: null,
      dryRunResult: null,
    });
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    initializeWizard,
    executeLayer,
    runDryRun,
    validateDatabase,
    getProgress,
    executeRollback,
    clearError,
    resetWizard,
  };
}