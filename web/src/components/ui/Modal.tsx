"use client";

import React, { useEffect } from 'react';
import { useFocusTrap, useEscapeKey } from '@/hooks/useKeyboardNavigation';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  preventClose?: boolean;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  preventClose = false,
}: Props) {
  const modalRef = useFocusTrap<HTMLDivElement>(open);

  // Close on Escape key
  useEscapeKey(() => {
    if (!preventClose) {
      onClose();
    }
  }, open);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm modal-backdrop-enter-active overflow-y-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-[var(--card)] text-[var(--foreground)]
          rounded-xl shadow-2xl border border-[var(--border)]
          max-h-[95vh] sm:max-h-[90vh] overflow-hidden
          modal-content-enter-active animate-elastic
          my-auto
        `}
      >
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0 animate-slide-in-right">
          <h3 id="modal-title" className="text-base sm:text-lg font-semibold animate-gentle-fade-in">{title}</h3>
          {!preventClose && (
            <button
              aria-label="Close modal"
              onClick={onClose}
              className="p-2 rounded-md hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] animate-slide-in-left hover-lift"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 sm:py-4 overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-100px)] animate-gentle-fade-in">{children}</div>
      </div>
    </div>
  );
}

