/**
 * Step Progress Component
 * 
 * Displays detailed progress for each layer with real-time updates
 * Timesheet Manager - ABZ Group
 */

'use client';

import React from 'react';
import { WizardProgress } from '@/types/database';

interface StepProgressProps {
  progress: WizardProgress;
  currentLayer: number;
  onLayerSelect?: (layer: number) => void;
}

export default function StepProgress({ progress, currentLayer, onLayerSelect }: StepProgressProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'running':
        return (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      case 'skipped':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        );
      default:
        return (
          <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'skipped': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'running': return 'Running';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'skipped': return 'Skipped';
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Layer Progress
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {progress.completedLayers} of {progress.totalLayers} completed
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${(progress.completedLayers / progress.totalLayers) * 100}%` }}
        />
      </div>

      {/* Layer List */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {progress.layers.map((layer) => (
          <div
            key={layer.id}
            className={`
              p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm
              ${getStatusColor(layer.status)}
              ${layer.order === currentLayer ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
              ${onLayerSelect ? 'hover:border-blue-300' : ''}
            `}
            onClick={() => onLayerSelect?.(layer.order)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(layer.status)}
                <div>
                  <div className="font-medium text-sm">
                    Layer {layer.order}: {layer.name}
                  </div>
                  <div className="text-xs opacity-75">
                    {layer.description}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium">
                  {getStatusText(layer.status)}
                </div>
                {layer.components > 0 && (
                  <div className="text-xs opacity-75">
                    {layer.components} components
                  </div>
                )}
                {layer.duration && (
                  <div className="text-xs opacity-75">
                    {Math.round(layer.duration / 1000)}s
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {layer.error && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-xs">
                <div className="font-medium text-red-800 dark:text-red-200">Error:</div>
                <div className="text-red-700 dark:text-red-300">{layer.error}</div>
              </div>
            )}

            {/* Progress Details */}
            {layer.status === 'running' && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Executing...</span>
                  <span>Processing SQL statements</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                  <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {progress.layers.filter(l => l.status === 'completed').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Completed
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            {progress.layers.filter(l => l.status === 'running').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Running
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            {progress.layers.filter(l => l.status === 'failed').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Failed
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600">
            {progress.layers.filter(l => l.status === 'pending').length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Pending
          </div>
        </div>
      </div>

      {/* Timing Information */}
      {progress.startedAt && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Started:</span>
              <span className="ml-2 font-medium">
                {new Date(progress.startedAt).toLocaleTimeString()}
              </span>
            </div>
            
            {progress.estimatedCompletion && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Est. Completion:</span>
                <span className="ml-2 font-medium">
                  {new Date(progress.estimatedCompletion).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}