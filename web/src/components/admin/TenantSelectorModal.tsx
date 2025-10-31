"use client";

import { useState } from 'react';
import Modal from '@/components/ui/Modal';

export type TenantOption = { id: string; name: string };

export default function TenantSelectorModal({
  open,
  tenants,
  onClose,
  onSelected,
}: {
  open: boolean;
  tenants: TenantOption[];
  onClose: () => void;
  onSelected: (tenantId: string) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await onSelected(selected);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Falha ao definir tenant');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Selecionar Tenant">
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted-foreground)]">Selecione o tenant para continuar.</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
        >
          <option value="">--</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {error && <div className="text-[var(--destructive)] text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]">Cancelar</button>
          <button disabled={!selected || saving} onClick={handleConfirm} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">Confirmar</button>
        </div>
      </div>
    </Modal>
  );
}

