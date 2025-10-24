"use client";

import React from 'react';

type Toast = { id: number; message: string; variant?: 'success' | 'error' | 'info' };

type Ctx = {
  show: (message: string, variant?: Toast['variant']) => void;
};

const ToastCtx = React.createContext<Ctx | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(1);

  const show = React.useCallback((message: string, variant: Toast['variant'] = 'info') => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[240px] px-4 py-3 rounded-lg shadow-lg border text-sm
              ${t.variant === 'success' ? 'bg-emerald-600 text-white border-emerald-700' : ''}
              ${t.variant === 'error' ? 'bg-red-600 text-white border-red-700' : ''}
              ${t.variant === 'info' ? 'bg-gray-900 text-white border-gray-800' : ''}
            `}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

