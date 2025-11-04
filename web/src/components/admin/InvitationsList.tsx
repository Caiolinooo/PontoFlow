"use client";

import React, { useState, useEffect } from 'react';
import InvitationRowActions from './InvitationRowActions';

interface Invitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  token: string;
  invited_at: string;
  expires_at: string;
  invited_by_name: string;
}

interface InvitationsListProps {
  locale: string;
  onUpdate: () => void;
}

export default function InvitationsList({ locale, onUpdate }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadInvitations();
  }, [filter]);

  const loadInvitations = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = filter === 'all' 
        ? '/api/admin/invitations'
        : `/api/admin/invitations?status=${filter}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Erro ao carregar convites');
        setLoading(false);
        return;
      }

      setInvitations(data.invitations || []);
    } catch (err) {
      console.error('Error loading invitations:', err);
      setError('Erro ao carregar convites. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    loadInvitations();
    onUpdate();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };

    const labels = {
      pending: 'Pendente',
      accepted: 'Aceito',
      expired: 'Expirado',
      cancelled: 'Cancelado',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges] || badges.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      USER: 'Usuário',
      MANAGER_TIMESHEET: 'Gerente de Timesheet',
      MANAGER: 'Gerente',
      ADMIN: 'Administrador',
    };
    return roles[role] || role;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry > 0 && hoursUntilExpiry < 24;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-6 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--foreground)]">Filtrar por:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'accepted'
                ? 'bg-green-600 text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
            }`}
          >
            Aceitos
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'expired'
                ? 'bg-gray-600 text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
            }`}
          >
            Expirados
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'cancelled'
                ? 'bg-red-600 text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80'
            }`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-[var(--muted-foreground)]">Carregando convites...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
            <button
              onClick={loadInvitations}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-[var(--muted-foreground)] text-lg">Nenhum convite encontrado</p>
              <p className="text-[var(--muted-foreground)] text-sm mt-1">
                {filter === 'all' ? 'Crie um novo convite para começar' : `Nenhum convite ${filter}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-[var(--card-foreground)] truncate">
                        {invitation.first_name} {invitation.last_name}
                      </h4>
                      {getStatusBadge(invitation.status)}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <p className="text-[var(--muted-foreground)]">
                        <span className="font-medium">Email:</span> {invitation.email}
                      </p>
                      <p className="text-[var(--muted-foreground)]">
                        <span className="font-medium">Função:</span> {getRoleName(invitation.role)}
                      </p>
                      <p className="text-[var(--muted-foreground)]">
                        <span className="font-medium">Convidado por:</span> {invitation.invited_by_name}
                      </p>
                      <p className="text-[var(--muted-foreground)]">
                        <span className="font-medium">Enviado em:</span> {formatDate(invitation.invited_at)}
                      </p>
                      {invitation.status === 'pending' && (
                        <p className={`${isExpiringSoon(invitation.expires_at) ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-[var(--muted-foreground)]'}`}>
                          <span className="font-medium">Expira em:</span> {formatDate(invitation.expires_at)}
                          {isExpiringSoon(invitation.expires_at) && ' ⚠️ Expira em breve!'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <InvitationRowActions
                      invitationId={invitation.id}
                      status={invitation.status}
                      token={invitation.token}
                      locale={locale}
                      onAction={handleAction}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

