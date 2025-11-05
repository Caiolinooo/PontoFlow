/**
 * Setup Wizard Modal Component
 * 
 * Main modal interface for the database setup wizard
 * Provides step-by-step wizard UI with real-time progress tracking
 * Timesheet Manager - ABZ Group
 */

'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Stepper from '@/components/ui/Stepper';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useSetupWizard } from '@/hooks/useSetupWizard';
import { WizardProgress, WizardLayer } from '@/types/database';
import WizardStepContent from './WizardStepContent';
import StepProgress from './StepProgress';

interface SetupWizardModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type WizardStep = 'welcome' | 'layers' | 'progress' | 'completed' | 'error';

export default function SetupWizardModal({ open, onClose, onComplete }: SetupWizardModalProps) {
  const {
    initialized,
    loading,
    error,
    progress,
    currentLayer,
    executionResult,
    dryRunResult,
    initializeWizard,
    executeLayer,
    runDryRun,
    validateDatabase,
    getProgress,
    executeRollback,
    clearError,
    resetWizard,
  } = useSetupWizard();

  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [showDryRunResult, setShowDryRunResult] = useState(false);
  const [dryRunData, setDryRunData] = useState<any>(null);

  // Initialize wizard when modal opens
  useEffect(() => {
    if (open && !initialized) {
      initializeWizard();
    }
  }, [open, initialized, initializeWizard]);

  // Handle step changes based on progress
  useEffect(() => {
    if (progress) {
      if (progress.status === 'completed') {
        setCurrentStep('completed');
      } else if (progress.status === 'failed') {
        setCurrentStep('error');
      } else if (progress.completedLayers > 0) {
        setCurrentStep('progress');
      } else {
        setCurrentStep('layers');
      }
    }
  }, [progress]);

  const handleClose = () => {
    setCurrentStep('welcome');
    setSelectedLayer(null);
    setShowDryRunResult(false);
    setDryRunData(null);
    if (error) clearError();
    resetWizard();
    onClose();
  };

  const handleLayerExecute = async (layer: number, options: any = {}) => {
    setSelectedLayer(layer);
    const result = await executeLayer({ layer, ...options });
    if (result?.success) {
      await getProgress(); // Refresh progress
    }
  };

  const handleLayerDryRun = async (layer: number) => {
    const result = await runDryRun(layer);
    if (result) {
      setDryRunData(result);
      setShowDryRunResult(true);
    }
  };

  const handleRollback = async () => {
    const success = await executeRollback('ROLLBACK-CONFIRM');
    if (success) {
      setCurrentStep('welcome');
      onComplete?.();
    }
  };

  const stepperSteps = [
    { id: 1, label: 'Welcome', description: 'Start wizard' },
    { id: 2, label: 'Layers', description: 'Select layers to execute' },
    { id: 3, label: 'Progress', description: 'Monitor execution' },
    { id: 4, label: 'Complete', description: 'Setup finished' },
  ];

  const getCurrentStepNumber = () => {
    switch (currentStep) {
      case 'welcome': return 1;
      case 'layers': return 2;
      case 'progress': return 3;
      case 'completed': return 4;
      case 'error': return 3;
      default: return 1;
    }
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Database Setup Wizard"
        size="xl"
        preventClose={loading}
      >
        {/* Stepper */}
        <div className="mb-6">
          <Stepper
            steps={stepperSteps}
            currentStep={getCurrentStepNumber()}
            allowClickNavigation={false}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
              <button
                onClick={clearError}
                className="ml-3 p-1 text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
              {currentStep === 'welcome' ? 'Initializing wizard...' : 'Processing...'}
            </span>
          </div>
        )}

        {/* Step Content */}
        {!loading && progress && (
          <WizardStepContent
            step={currentStep}
            progress={progress}
            currentLayer={currentLayer}
            executionResult={executionResult}
            dryRunResult={dryRunResult}
            onLayerExecute={handleLayerExecute}
            onLayerDryRun={handleLayerDryRun}
            onValidate={validateDatabase}
            onRollback={() => setShowRollbackDialog(true)}
            onComplete={() => {
              setCurrentStep('completed');
              onComplete?.();
            }}
            onRetry={() => {
              setCurrentStep('layers');
              clearError();
            }}
          />
        )}

        {/* Progress Display */}
        {!loading && currentStep === 'progress' && progress && (
          <div className="mt-6">
            <StepProgress
              progress={progress}
              currentLayer={currentLayer}
              onLayerSelect={setSelectedLayer}
            />
          </div>
        )}
      </Modal>

      {/* Rollback Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRollbackDialog}
        title="Execute Rollback"
        message="This will rollback ALL database changes made by the wizard. This action is IRREVERSIBLE and will DELETE ALL DATA created during setup. Are you sure you want to continue?"
        confirmText="Execute Rollback"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={() => {
          setShowRollbackDialog(false);
          handleRollback();
        }}
        onCancel={() => setShowRollbackDialog(false)}
      />

      {/* Dry Run Results Dialog */}
      {showDryRunResult && dryRunData && (
        <Modal
          open={showDryRunResult}
          onClose={() => setShowDryRunResult(false)}
          title="Dry Run Results"
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Layer {dryRunData.layer}
                </div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {dryRunData.layerName}
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                  Estimated Duration
                </div>
                <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                  {Math.round(dryRunData.estimatedDuration / 1000)}s
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dryRunData.statementsCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  SQL Statements
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dryRunData.affectedTables.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Affected Tables
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {dryRunData.warnings.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Warnings
                </div>
              </div>
            </div>

            {dryRunData.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Warnings
                </h4>
                {dryRunData.warnings.map((warning: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <svg className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setShowDryRunResult(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}