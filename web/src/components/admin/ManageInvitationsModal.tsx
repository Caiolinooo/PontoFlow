"use client";

import React, { useState, useEffect } from 'react';
import InviteUserForm from './InviteUserForm';
import InvitationsList from './InvitationsList';

interface ManageInvitationsModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: string;
}

type TabType = 'create' | 'manage';

export default function ManageInvitationsModal({ 
  open, 
  onClose, 
  onSuccess,
  locale 
}: ManageInvitationsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleClose = () => {
    setActiveTab('create');
    onClose();
  };

  const handleInviteSuccess = () => {
    setRefreshKey(prev => prev + 1);
    onSuccess();
    // Switch to manage tab to show the new invitation
    setTimeout(() => setActiveTab('manage'), 500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--card)] rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[var(--card)] border-b border-[var(--border)] p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[var(--card-foreground)]">
              Gerenciar Convites
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Crie novos convites ou gerencie convites existentes
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--border)] bg-[var(--card)] flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'create'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Criar Novo Convite
              </div>
              {activeTab === 'create' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 font-medium transition-colors relative ${
                activeTab === 'manage'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Gerenciar Convites
              </div>
              {activeTab === 'manage' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400" />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'create' ? (
            <InviteUserForm onSuccess={handleInviteSuccess} onCancel={handleClose} />
          ) : (
            <InvitationsList key={refreshKey} locale={locale} onUpdate={() => setRefreshKey(prev => prev + 1)} />
          )}
        </div>
      </div>
    </div>
  );
}

