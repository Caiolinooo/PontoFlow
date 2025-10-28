"use client";
import React from 'react';
import Modal from '@/components/ui/Modal';

export type ManagerEntry = {
  id: string;
  data: string;
  environment_id?: string | null;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  timesheetId: string;
  entry: ManagerEntry;
  onSaved?: () => void;
};

export default function EntryEditModal({ open, onClose, timesheetId, entry, onSaved }: Props) {
  const [form, setForm] = React.useState({
    data: entry.data || '',
    tipo: (entry.tipo as string) || 'embarque',
    hora_ini: entry.hora_ini || '',
    hora_fim: entry.hora_fim || '',
    observacao: entry.observacao || '',
    justification: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        data: entry.data || '',
        tipo: (entry.tipo as string) || 'embarque',
        hora_ini: entry.hora_ini || '',
        hora_fim: entry.hora_fim || '',
        observacao: entry.observacao || '',
        justification: '',
      });
      setError(null);
    }
  }, [open, entry]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/timesheets/${timesheetId}/entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: form.data,
          tipo: form.tipo,
          hora_ini: form.hora_ini || null,
          hora_fim: form.hora_fim || null,
          observacao: form.observacao || null,
          justification: form.justification || '',
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j?.error === 'justification_required') {
          setError('Período fechado: justificativa obrigatória (mín. 10 caracteres).');
        } else {
          setError('Falha ao salvar alterações.');
        }
        return;
      }
      onClose();
      onSaved?.();
    } catch (e) {
      setError('Erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={"Editar lançamento"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1">Data</label>
          <input type="date" className="w-full border rounded p-2 text-sm" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs mb-1">Tipo</label>
          <select className="w-full border rounded p-2 text-sm" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
            <option value="embarque">Embarque</option>
            <option value="desembarque">Desembarque</option>
            <option value="translado">Translado</option>
            <option value="onshore">Onshore</option>
            <option value="offshore">Offshore</option>
            <option value="folga">Folga</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1">Hora início</label>
          <input type="time" className="w-full border rounded p-2 text-sm" value={form.hora_ini} onChange={e=>setForm(f=>({...f,hora_ini:e.target.value}))} />
        </div>
        <div>
          <label className="block text-xs mb-1">Hora fim</label>
          <input type="time" className="w-full border rounded p-2 text-sm" value={form.hora_fim} onChange={e=>setForm(f=>({...f,hora_fim:e.target.value}))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Observação</label>
          <textarea rows={3} className="w-full border rounded p-2 text-sm" value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Justificativa (obrigatória se o período estiver fechado)</label>
          <textarea rows={3} className="w-full border rounded p-2 text-sm" value={form.justification} onChange={e=>setForm(f=>({...f,justification:e.target.value}))} />
        </div>
        {error && <div className="md:col-span-2 text-[var(--destructive)] text-sm">{error}</div>}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} disabled={saving} className="px-3 py-1.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">Cancelar</button>
        <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">Salvar</button>
      </div>
    </Modal>
  );
}

