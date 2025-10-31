'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type Entry = {
  id: string;
  data: string;
  environment_id?: string | null;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
};

type Environment = {
  id: string;
  name: string;
  slug: string;
  auto_fill_enabled?: boolean;
};

type WorkSchedule = {
  work_schedule: string;
  days_on: number | null;
  days_off: number | null;
  start_date: string;
};

type PendingOperation =
  | { type: 'create'; tempId: string; entry: Omit<Entry, 'id'> }
  | { type: 'delete'; entryId: string };

interface TimesheetModalProps {
  isOpen: boolean;
  selectedDate: string | null;
  entries: Entry[];
  environments: Environment[];
  workSchedule?: WorkSchedule | null;
  tenantWorkMode?: 'offshore' | 'standard' | 'flexible';
  form: {
    environment_id: string;
    hora_ini: string;
    observacao: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    environment_id: string;
    hora_ini: string;
    observacao: string;
  }>>;
  selectedEnvironment: string;
  setSelectedEnvironment: React.Dispatch<React.SetStateAction<string>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  pendingOperations: PendingOperation[];
  onClose: () => void;
  onEntriesUpdate: (entries: Entry[]) => void;
  onSetPendingOperations: React.Dispatch<React.SetStateAction<PendingOperation[]>>;
  locale: string;
  timesheetId: string;
}

export default function TimesheetModal({
  isOpen,
  selectedDate,
  entries,
  environments,
  workSchedule,
  tenantWorkMode = 'standard',
  form,
  setForm,
  selectedEnvironment,
  setSelectedEnvironment,
  error,
  setError,
  loading,
  pendingOperations,
  onClose,
  onEntriesUpdate,
  onSetPendingOperations,
  locale,
  timesheetId,
}: TimesheetModalProps) {
  
  const dateEntries = entries.filter(e => e.data === selectedDate);

  const handleCreateEntry = () => {
    if (!selectedDate || !form.environment_id) {
      setError('Por favor, selecione um ambiente');
      return;
    }

    setError(null);

    // Generate temporary ID
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Create entry object
    const newEntry: Entry = {
      id: tempId,
      data: selectedDate,
      environment_id: form.environment_id,
      hora_ini: form.hora_ini || null,
      hora_fim: null,
      observacao: form.observacao || null,
    };

    // Add to pending operations
    onSetPendingOperations(ops => [...ops, {
      type: 'create',
      tempId,
      entry: newEntry
    }]);

    // Add to UI immediately (optimistic update)
    onEntriesUpdate([...entries, newEntry]);

    // Reset form
    setForm({
      environment_id: '',
      hora_ini: '',
      observacao: '',
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    // Check if this is a temporary entry (not yet saved to server)
    const isTempEntry = entryId.startsWith('temp-');

    if (isTempEntry) {
      // Remove from pending operations
      onSetPendingOperations(ops => ops.filter(op => 
        op.type !== 'create' || op.tempId !== entryId
      ));
    } else {
      // Add to pending delete operations
      onSetPendingOperations(ops => [...ops, {
        type: 'delete',
        entryId
      }]);
    }

    // Remove from UI immediately (optimistic update)
    onEntriesUpdate(entries.filter(e => e.id !== entryId));
  };

  if (!isOpen || !selectedDate) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={`Lançamentos - ${selectedDate}`} size="lg">
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Existing Entries */}
        {dateEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-sm text-[var(--muted-foreground)]">Lançamentos existentes</h3>
            {dateEntries.map(entry => {
              const env = environments.find(e => e.id === entry.environment_id);
              return (
                <div key={entry.id} className="p-3 bg-[var(--surface)] rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{env?.name || 'Ambiente desconhecido'}</div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {entry.hora_ini && `Início: ${entry.hora_ini}`}
                      {entry.hora_fim && ` - Fim: ${entry.hora_fim}`}
                    </div>
                    {entry.observacao && (
                      <div className="text-sm text-[var(--muted-foreground)] mt-1">{entry.observacao}</div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Excluir
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Entry Form */}
        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <h3 className="font-medium text-sm text-[var(--muted-foreground)]">Adicionar novo lançamento</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Ambiente</label>
            <select
              className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--background)] text-[var(--foreground)]"
              value={form.environment_id}
              onChange={e => setForm(f => ({ ...f, environment_id: e.target.value }))}
            >
              <option value="">Selecione um ambiente</option>
              {environments.map(env => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hora de início</label>
            <input
              type="time"
              className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--background)] text-[var(--foreground)]"
              value={form.hora_ini}
              onChange={e => setForm(f => ({ ...f, hora_ini: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observação</label>
            <textarea
              rows={3}
              className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--background)] text-[var(--foreground)]"
              value={form.observacao}
              onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))}
              placeholder="Observações opcionais..."
            />
          </div>

          <Button
            onClick={handleCreateEntry}
            disabled={loading || !form.environment_id}
            className="w-full"
          >
            Adicionar Lançamento
          </Button>
        </div>

        {/* Pending Operations Info */}
        {pendingOperations.length > 0 && (
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded-lg text-sm">
            {pendingOperations.length} operação(ões) pendente(s). Serão salvas ao fechar o modal.
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

