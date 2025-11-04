"use client";

import React, { useState } from 'react';

interface InvitationRowActionsProps {
  invitationId: string;
  status: string;
  token: string;
  locale: string;
}

export default function InvitationRowActions({ 
  invitationId, 
  status, 
  token, 
  locale 
}: InvitationRowActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const handleResend = async () => {
    if (!confirm('Deseja reenviar este convite?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        alert(data.error || 'Erro ao reenviar convite');
      } else {
        alert('Convite reenviado com sucesso!');
        window.location.reload();
      }
    } catch (error) {
      alert('Erro ao reenviar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Deseja cancelar este convite? Esta ação não pode ser desfeita.')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        alert(data.error || 'Erro ao cancelar convite');
      } else {
        alert('Convite cancelado com sucesso!');
        window.location.reload();
      }
    } catch (error) {
      alert('Erro ao cancelar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const inviteUrl = `${window.location.origin}/${locale}/auth/accept-invite?token=${token}`;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      alert('Erro ao copiar link');
    }
  };

  if (status === 'accepted') {
    return (
      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
        ✓ Aceito
      </span>
    );
  }

  if (status === 'expired' || status === 'cancelled') {
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {status === 'expired' ? 'Expirado' : 'Cancelado'}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {showCopySuccess && (
        <span className="text-xs text-green-600 dark:text-green-400 font-medium animate-fade-in">
          ✓ Copiado!
        </span>
      )}
      
      <button
        onClick={handleCopyLink}
        disabled={loading}
        title="Copiar link do convite"
        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      <button
        onClick={handleResend}
        disabled={loading}
        title="Reenviar convite"
        className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>

      <button
        onClick={handleCancel}
        disabled={loading}
        title="Cancelar convite"
        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

