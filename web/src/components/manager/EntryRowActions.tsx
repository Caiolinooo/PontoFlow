"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import EntryEditModal, { ManagerEntry } from './EntryEditModal';

export default function EntryRowActions({ timesheetId, entry, onChanged }: { timesheetId: string; entry: ManagerEntry; onChanged?: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    if (onChanged) {
      onChanged();
    } else {
      router.refresh();
    }
  };

  const del = async () => {
    const promptText = 'Informe a justificativa para excluir este lançamento (obrigatória se o período estiver fechado). Mínimo 10 caracteres.';
    const input = window.prompt(promptText, '');
    if (input === null) return; // cancelado
    const justification = input.trim();
    setBusy(true);
    try {
      const res = await fetch(`/api/manager/timesheets/${timesheetId}/entries/${entry.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification })
      });
      if (!res.ok) throw new Error('Falha ao excluir lançamento');
      handleRefresh();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2 justify-end">
      <button disabled={busy} onClick={() => setOpen(true)} title="Editar"
        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Editar</button>
      <button disabled={busy} onClick={del} title="Excluir"
        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Excluir</button>
      <EntryEditModal open={open} onClose={() => setOpen(false)} entry={entry} timesheetId={timesheetId} onSaved={handleRefresh} />
    </div>
  );
}

