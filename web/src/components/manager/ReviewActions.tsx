"use client";
import React from 'react';

type Entry = { id: string; data: string; tipo: string };

type Props = {
  timesheetId: string;
  entries: Entry[];
  labels: {
    approve: string;
    reject: string;
    rejectTitle: string;
    rejectReason: string;
    addAnnotation: string;
    fieldLabel: string;
    entryLabel: string;
    messageLabel: string;
    submit: string;
    cancel: string;
  };
};

export default function ReviewActions({timesheetId, entries, labels}: Props) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [annotations, setAnnotations] = React.useState<Array<{entry_id?: string; field?: string; message: string}>>([]);
  const [loading, setLoading] = React.useState(false);

  const addAnnotation = () => setAnnotations(prev => [...prev, {message: ""}]);
  const updateAnnotation = (idx: number, patch: Partial<{entry_id?: string; field?: string; message: string}>) => {
    setAnnotations(prev => prev.map((a, i) => i === idx ? {...a, ...patch} : a));
  };
  const removeAnnotation = (idx: number) => setAnnotations(prev => prev.filter((_, i) => i !== idx));

  const onApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/timesheets/${timesheetId}/approve`, {method: 'POST'});
      if (!res.ok) throw new Error('approve_failed');
      window.location.reload();
    } catch {
      setLoading(false);
    }
  };

  const onReject = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/timesheets/${timesheetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, annotations: annotations.filter(a => a.message.trim().length > 0) })
      });
      if (!res.ok) throw new Error('reject_failed');
      window.location.reload();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button disabled={loading} onClick={onApprove} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {labels.approve}
      </button>
      <button disabled={loading} onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-[var(--destructive)] text-[var(--destructive-foreground)] text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
        {labels.reject}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
          <div className="bg-white rounded shadow-lg w-full max-w-lg p-4">
            <h3 className="font-medium mb-2">{labels.rejectTitle}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">{labels.rejectReason}</label>
                <textarea className="w-full border rounded p-2 text-sm" rows={3} value={reason} onChange={e => setReason(e.target.value)} required />
              </div>

              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{labels.addAnnotation}</div>
                <button type="button" onClick={addAnnotation} className="text-sm px-2 py-1 border rounded">+</button>
              </div>

              {annotations.map((a, idx) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end" key={idx}>
                  <div>
                    <label className="block text-xs mb-1">{labels.entryLabel}</label>
                    <select className="w-full border rounded p-2 text-sm" value={a.entry_id ?? ''} onChange={e => updateAnnotation(idx, {entry_id: e.target.value || undefined})}>
                      <option value="">-</option>
                      {entries.map(e => (
                        <option key={e.id} value={e.id}>{e.data} - {e.tipo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs mb-1">{labels.fieldLabel}</label>
                    <input className="w-full border rounded p-2 text-sm" value={a.field ?? ''} onChange={e => updateAnnotation(idx, {field: e.target.value || undefined})} placeholder="observacao|hora_ini|hora_fim|data" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs mb-1">{labels.messageLabel}</label>
                    <div className="flex gap-2">
                      <input className="w-full border rounded p-2 text-sm" value={a.message} onChange={e => updateAnnotation(idx, {message: e.target.value})} />
                      <button type="button" onClick={() => removeAnnotation(idx)} className="text-sm px-2 py-1 border rounded">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-2 border rounded text-sm" onClick={() => setOpen(false)}>{labels.cancel}</button>
              <button disabled={loading || !reason.trim()} className="px-3 py-2 rounded bg-red-600 text-white text-sm" onClick={onReject}>{labels.submit}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

