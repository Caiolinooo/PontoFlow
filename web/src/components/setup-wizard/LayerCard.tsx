/**
 * Layer Card Component
 * 
 * Individual layer card showing status and action buttons
 * Timesheet Manager - ABZ Group
 */

'use client';

import React from 'react';
import { WizardLayer } from '@/types/database';

interface LayerCardProps {
  layer: WizardLayer;
  onExecute: () => Promise<void>;
  onDryRun: () => Promise<void>;
  onSelect?: (selected: boolean) => void;
  isExecuting?: boolean;
  isSelected?: boolean;
  disabled?: boolean;
}

export default function LayerCard({
  layer,
  onExecute,
  onDryRun,
  onSelect,
  isExecuting = false,
  isSelected = false,
  disabled = false,
}: LayerCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'running':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'failed': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'running': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default: return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getLayerIcon = (order: number) => {
    if (order === 1) {
      return (
        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    } else if (order <= 3) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      );
    } else if (order <= 6) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    } else if (order <= 9) {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
  };

  const getLayerDescription = (name: string, order: number) => {
    const descriptions: Record<number, string> = {
      1: 'PostgreSQL extensions and basic setup',
      2: 'Core database tables (tenants, users)',
      3: 'User management and environment tables',
      4: 'Role-based access control tables',
      5: 'Employee and group management',
      6: 'Assignment and delegation tables',
      7: 'Timesheet and period management',
      8: 'Timesheet entries and approvals',
      9: 'Communication and audit logging',
      10: 'Database functions and stored procedures',
      11: 'Triggers for data automation',
      12: 'Performance optimization indexes',
      13: 'Row Level Security (RLS) policies',
    };
    return descriptions[order] || 'Database setup layer';
  };

  const canExecute = layer.status === 'pending' || layer.status === 'failed';
  const showActions = layer.status === 'pending' || layer.status === 'failed';

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all
        ${getStatusColor(layer.status)}
        ${isSelected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
        ${disabled ? 'opacity-50' : ''}
        ${showActions ? 'hover:shadow-md cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Selection Checkbox */}
          {onSelect && showActions && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
              disabled={disabled || !canExecute}
              className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          )}

          {/* Status Icon */}
          <div className="mt-1">
            {getStatusIcon(layer.status)}
          </div>

          {/* Layer Icon */}
          <div className="mt-0.5">
            {getLayerIcon(layer.order)}
          </div>

          {/* Layer Information */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Layer {layer.order}
              </h4>
              <span
                className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${getStatusBadgeColor(layer.status)}
                `}
              >
                {layer.status}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {layer.name}
            </p>
            
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {getLayerDescription(layer.name, layer.order)}
            </p>

            {/* Component Count */}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
              <span>{layer.components} components</span>
              {layer.duration && (
                <span>{Math.round(layer.duration / 1000)}s duration</span>
              )}
              {layer.startTime && (
                <span>
                  Started: {new Date(layer.startTime).toLocaleTimeString()}
                </span>
              )}
              {layer.endTime && (
                <span>
                  Completed: {new Date(layer.endTime).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Error Display */}
            {layer.error && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-xs">
                <div className="font-medium text-red-800 dark:text-red-200">Error:</div>
                <div className="text-red-700 dark:text-red-300">{layer.error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && !disabled && (
          <div className="flex space-x-2 ml-4">
            <button
              onClick={onDryRun}
              disabled={isExecuting}
              className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Dry Run
            </button>
            
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isExecuting ? (
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  <span>Executing</span>
                </div>
              ) : (
                'Execute'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}