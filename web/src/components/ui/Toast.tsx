'use client';

import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`${bgColors[type]} text-white px-4 py-3 rounded shadow-lg flex items-center gap-2`}
      role="alert"
      aria-live="polite"
    >
      <span className="font-bold">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

/**
 * Toast container for managing multiple toasts
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  // Note: addToast can be used for programmatic toast creation
  // Currently toasts are managed via state, but this function is kept for future use
  // const addToast = (props: ToastProps) => {
  //   const id = Math.random().toString(36).substr(2, 9);
  //   setToasts((prev) => [...prev, { ...props, id }]);
  // };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

