"use client";

import React from 'react';

export interface Step {
  id: number;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  allowClickNavigation?: boolean;
}

export default function Stepper({ 
  steps, 
  currentStep, 
  onStepClick, 
  allowClickNavigation = false 
}: StepperProps) {
  const handleStepClick = (stepId: number) => {
    if (allowClickNavigation && onStepClick && stepId <= currentStep) {
      onStepClick(stepId);
    }
  };

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = allowClickNavigation && step.id <= currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isClickable}
                  className={`
                    relative flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm
                    transition-all duration-300 ease-in-out
                    ${isActive
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg scale-110 ring-4 ring-[var(--primary)]/20'
                      : isCompleted
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] border-2 border-[var(--border)]'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.id}</span>
                  )}

                  {/* Pulse animation for active step */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full bg-[var(--primary)] animate-ping opacity-20"></span>
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <p className={`
                    text-xs font-medium transition-colors
                    ${isActive
                      ? 'text-[var(--primary)] font-semibold'
                      : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-[var(--muted-foreground)]'
                    }
                  `}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 -mt-12 relative">
                  <div className="absolute inset-0 bg-[var(--border)]"></div>
                  <div
                    className={`
                      absolute inset-0 transition-all duration-500 ease-in-out
                      ${isCompleted
                        ? 'bg-green-500 w-full'
                        : 'bg-[var(--primary)] w-0'
                      }
                    `}
                  ></div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

