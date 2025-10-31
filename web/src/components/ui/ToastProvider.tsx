"use client";

import React from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: number;
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

type Ctx = {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ToastIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(1);

  const show = React.useCallback((message: string, variant: ToastVariant = 'info', duration = 3500) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, message, variant, duration }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const success = React.useCallback((message: string, duration?: number) => show(message, 'success', duration), [show]);
  const error = React.useCallback((message: string, duration?: number) => show(message, 'error', duration), [show]);
  const info = React.useCallback((message: string, duration?: number) => show(message, 'info', duration), [show]);
  const warning = React.useCallback((message: string, duration?: number) => show(message, 'warning', duration), [show]);

  const getToastStyles = (variant: ToastVariant) => {
    const styles = {
      success: 'bg-green-600 dark:bg-green-700 text-white border-green-700 dark:border-green-600',
      error: 'bg-red-600 dark:bg-red-700 text-white border-red-700 dark:border-red-600',
      warning: 'bg-amber-600 dark:bg-amber-700 text-white border-amber-700 dark:border-amber-600',
      info: 'bg-blue-600 dark:bg-blue-700 text-white border-blue-700 dark:border-blue-600',
    };
    return styles[variant];
  };

  return (
    <ToastCtx.Provider value={{ show, success, error, info, warning }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              min-w-[280px] px-4 py-3 rounded-lg shadow-lg border text-sm
              flex items-center gap-3
              animate-in slide-in-from-right-full duration-300
              ${getToastStyles(t.variant || 'info')}
            `}
            role="alert"
            aria-live="polite"
          >
            <div className="flex-shrink-0">
              {ToastIcons[t.variant || 'info']}
            </div>
            <div className="flex-1 font-medium">
              {t.message}
            </div>
            <button
              onClick={() => setToasts((toasts) => toasts.filter((toast) => toast.id !== t.id))}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Close notification"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

