/**
 * Wizard Step Content Component
 * 
 * Renders different content based on wizard step
 * Timesheet Manager - ABZ Group
 */

'use client';

import React, { useState } from 'react';
import { WizardProgress, WizardExecutionResult, DryRunResult } from '@/types/database';
import LayerCard from './LayerCard';

interface WizardStepContentProps {
  step: 'welcome' | 'layers' | 'progress' | 'completed' | 'error';
  progress: WizardProgress;
  currentLayer: number;
  executionResult: WizardExecutionResult | null;
  dryRunResult: DryRunResult | null;
  onLayerExecute: (layer: number, options?: any) => Promise<void>;
  onLayerDryRun: (layer: number) => Promise<void>;
  onValidate: () => Promise<any>;
  onRollback: () => void;
  onComplete: () => void;
  onRetry: () => void;
}

export default function WizardStepContent({
  step,
  progress,
  currentLayer,
  executionResult,
  dryRunResult,
  onLayerExecute,
  onLayerDryRun,
  onValidate,
  onRollback,
  onComplete,
  onRetry,
}: WizardStepContentProps) {
  const [executingLayers, setExecutingLayers] = useState<Set<number>>(new Set());
  const [selectedLayers, setSelectedLayers] = useState<Set<number>>(new Set());

  const handleLayerExecute = async (layer: number) => {
    setExecutingLayers(prev => new Set(prev).add(layer));
    try {
      await onLayerExecute(layer);
    } finally {
      setExecutingLayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(layer);
        return newSet;
      });
    }
  };

  const handleSelectLayer = (layer: number, selected: boolean) => {
    setSelectedLayers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(layer);
      } else {
        newSet.delete(layer);
      }
      return newSet;
    });
  };

  const handleExecuteSelected = async () => {
    for (const layer of Array.from(selectedLayers).sort()) {
      await handleLayerExecute(layer);
    }
  };

  const handleExecuteAll = async () => {
    for (const layer of progress.layers) {
      if (layer.status === 'pending') {
        await handleLayerExecute(layer.order);
      }
    }
  };

  switch (step) {
    case 'welcome':
      return (
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Database Setup Wizard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              This wizard will help you set up the complete database structure for the Timesheet Manager. 
              It will create 12 layers of database components including tables, functions, triggers, indexes, and security policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">12 Database Layers</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Complete database structure with 27 tables, functions, and policies
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-green-900 dark:text-green-100">Safe Execution</h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Step-by-step execution with rollback capability and validation
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">Real-time Progress</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Monitor execution progress with detailed status updates
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-left">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Important Notes
                </h4>
                <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• This process may take 5-10 minutes to complete</li>
                  <li>• A backup will be created before making any changes</li>
                  <li>• You can execute layers individually or all at once</li>
                  <li>• Rollback is available if needed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onValidate}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Validate Database First
            </button>
          </div>
        </div>
      );

    case 'layers':
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select Layers to Execute
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Choose which layers to execute. You can execute them individually or in sequence.
            </p>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {progress.layers.map((layer) => (
              <LayerCard
                key={layer.id}
                layer={layer}
                onExecute={() => handleLayerExecute(layer.order)}
                onDryRun={() => onLayerDryRun(layer.order)}
                onSelect={(selected) => handleSelectLayer(layer.order, selected)}
                isExecuting={executingLayers.has(layer.order)}
                isSelected={selectedLayers.has(layer.order)}
                disabled={layer.status === 'completed'}
              />
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedLayers.size} layer(s) selected
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleExecuteSelected}
                disabled={selectedLayers.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Execute Selected ({selectedLayers.size})
              </button>
              
              <button
                onClick={handleExecuteAll}
                disabled={progress.layers.every(l => l.status === 'completed')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Execute All Pending
              </button>
            </div>
          </div>
        </div>
      );

    case 'progress':
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Execution in Progress
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Monitoring database setup execution...
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.completedLayers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Completed Layers
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.totalLayers - progress.completedLayers}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Pending Layers
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {Math.round((progress.completedLayers / progress.totalLayers) * 100)}%
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Progress
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {progress.status === 'in_progress' ? 'Running' : 'Idle'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Status
              </div>
            </div>
          </div>

          {executionResult && currentLayer && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                Latest Execution Result
              </h3>
              <div className="text-sm text-green-800 dark:text-green-200">
                <p>Layer {executionResult.layer}: {executionResult.layerName}</p>
                <p>Statements executed: {executionResult.statementsExecuted}</p>
                <p>Duration: {Math.round(executionResult.duration / 1000)}s</p>
                {executionResult.errors.length > 0 && (
                  <p className="text-red-600 dark:text-red-400">
                    Errors: {executionResult.errors.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      );

    case 'completed':
      return (
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Setup Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The database setup wizard has been completed successfully. All layers have been executed 
              and your database is now fully configured for the Timesheet Manager.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {progress.completedLayers}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Layers Completed
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                100%
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Success Rate
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                27
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">
                Database Objects
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
              What's Next?
            </h3>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• The database is now ready for use</li>
              <li>• You can start creating tenants and users</li>
              <li>• Configure tenant settings and SMTP</li>
              <li>• Import existing data if needed</li>
            </ul>
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Finish Setup
            </button>
            
            <button
              onClick={onRollback}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Rollback (if needed)
            </button>
          </div>
        </div>
      );

    case 'error':
      return (
        <div className="space-y-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Setup Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              The database setup wizard encountered an error during execution. 
              You can retry the failed layers or rollback all changes.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="font-medium text-red-900 dark:text-red-100 mb-2">
              Error Details
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200">
              Please check the error message above and try again. If the problem persists, 
              consider rolling back and starting fresh.
            </p>
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Retry
            </button>
            
            <button
              onClick={onRollback}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Rollback Changes
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}