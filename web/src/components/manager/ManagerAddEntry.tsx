"use client";
import React from 'react';

type Props = { timesheetId: string };

export default function ManagerAddEntry({ timesheetId }: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({ data: '', tipo: 'embarque', hora_ini: '', hora_fim: '', observacao: '', justification: '' });
  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/timesheets/${timesheetId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: form.data,
          tipo: form.tipo,
          hora_ini: form.hora_ini || null,
          hora_fim: form.hora_fim || null,
          observacao: form.observacao || null,
          justification: form.justification || ''
        })
      });
      if (!res.ok) throw new Error('failed');
      setOpen(false);
      window.location.reload();
    } catch (e) {
      alert('Falha ao criar lançamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-sm">Adicionar lançamento</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-xl w-full max-w-lg p-4">
            <div className="text-lg font-semibold mb-3">Novo lançamento</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                <label className="block text-xs mb-1">Início</label>
                <input type="time" className="w-full border rounded p-2 text-sm" value={form.hora_ini} onChange={e=>setForm(f=>({...f,hora_ini:e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs mb-1">Fim</label>
                <input type="time" className="w-full border rounded p-2 text-sm" value={form.hora_fim} onChange={e=>setForm(f=>({...f,hora_fim:e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">Observação</label>
                <input className="w-full border rounded p-2 text-sm" value={form.observacao} onChange={e=>setForm(f=>({...f,observacao:e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">Justificativa (requerida se período fechado)</label>
                <textarea className="w-full border rounded p-2 text-sm" rows={3} value={form.justification} onChange={e=>setForm(f=>({...f,justification:e.target.value}))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setOpen(false)} className="px-3 py-2 border rounded text-sm">Cancelar</button>
              <button disabled={loading} onClick={submit} className="px-3 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)] text-sm disabled:opacity-60">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
