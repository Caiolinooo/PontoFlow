"use client";
import React from 'react';

type Entry = { id: string; data: string; tipo: string; hora_ini?: string | null; hora_fim?: string | null; observacao?: string | null };
type Annotation = { id: string; entry_id?: string | null; field_path?: string | null; message: string };

type Props = {
  timesheetId: string;
  periodo_ini: string;
  blocked: boolean;
  entries: Entry[];
  annotations: Annotation[];
  labels: Record<string, string>;
  fullHeight?: boolean;
};

function firstDayOfNextMonthOf(dateISO: string) {
  const d = new Date(dateISO);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default function TimesheetEditor({timesheetId, periodo_ini, blocked, entries: initialEntries, annotations, labels, fullHeight}: Props) {
  const [entries, setEntries] = React.useState<Entry[]>(initialEntries);
  const [form, setForm] = React.useState({data: '', tipo: 'embarque', hora_ini: '', hora_fim: '', observacao: ''});
  const [loading, setLoading] = React.useState(false);

  const annMap = React.useMemo(() => {
    const byEntry = new Map<string, Annotation[]>();
    for (const a of annotations) {
      const key = a.entry_id ?? 'ts';
      if (!byEntry.has(key)) byEntry.set(key, []);
      byEntry.get(key)!.push(a);
    }
    return byEntry;
  }, [annotations]);

  const onCreate = async () => {
    if (blocked) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/timesheets/${timesheetId}/entries`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          data: form.data, tipo: form.tipo,
          hora_ini: form.hora_ini || null,
          hora_fim: form.hora_fim || null,
          observacao: form.observacao || null
        })
      });
      if (!res.ok) throw new Error('create_failed');
      // reload entries
      await reload();
      setForm({data: '', tipo: 'embarque', hora_ini: '', hora_fim: '', observacao: ''});
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    const r = await fetch(`/api/employee/timesheets/${timesheetId}`, {cache:'no-store'});
    if (r.ok) {
      const j = await r.json();
      setEntries(j.entries);
    }
  };

  const onDelete = async (entryId: string) => {
    if (blocked) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/timesheets/${timesheetId}/entries/${entryId}`, {method: 'DELETE'});
      if (!res.ok) throw new Error('delete_failed');
      await reload();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (blocked) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/employee/timesheets/${timesheetId}/submit`, {method: 'POST'});
      if (!res.ok) throw new Error('submit_failed');
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  const deadline = firstDayOfNextMonthOf(periodo_ini);
  const isPastDeadline = new Date() >= deadline;

  // Build month calendar from periodo_ini to end of month
  const start = React.useMemo(() => new Date(periodo_ini), [periodo_ini]);
  const end = React.useMemo(() => new Date(start.getFullYear(), start.getMonth() + 1, 0), [start]);
  const days = React.useMemo(() => {
    const list: string[] = [];
    const d = new Date(start);
    while (d <= end) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      list.push(`${y}-${m}-${day}`);
      d.setDate(d.getDate() + 1);
    }
    return list;
  }, [start, end]);

  // Cores por tipo (referência a padrões de ponto/logística)
  const tipoColor: Record<string, string> = {
    embarque: 'bg-blue-600 text-white',
    desembarque: 'bg-indigo-600 text-white',
    translado: 'bg-amber-500 text-white',
    onshore: 'bg-emerald-600 text-white',
    offshore: 'bg-cyan-600 text-white',
    folga: 'bg-zinc-400 text-white'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{labels.title}</h2>
        <button disabled={blocked || isPastDeadline || loading} className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50" onClick={onSubmit}>
          {labels.submit}
        </button>
      </div>

      {(blocked || isPastDeadline) && (
        <div className="p-3 rounded bg-yellow-100 text-yellow-900 text-sm">
          {labels.blocked}
        </div>
      )}

      {/* Calendário + legenda */}
      <div className={`border rounded p-3 ${fullHeight ? 'min-h-[70vh] md:min-h-[78vh]' : ''}`}>
        <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-gray-600">
          {['D','S','T','Q','Q','S','S'].map((d,i) => (<div key={i} className="text-center">{d}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            const firstDow = new Date(start.getFullYear(), start.getMonth(), 1).getDay();
            const blanks = Array.from({length: firstDow});
            return (
              <>
                {blanks.map((_,i) => (<div key={`b${i}`} />))}
                {days.map((iso) => {
                  const dayNum = Number(iso.split('-')[2]);
                  const dayEntries = entries.filter(e => e.data === iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setForm(f => ({...f, data: iso}))}
                      className={`border rounded p-2 text-left hover:bg-gray-50 ${form.data===iso? 'ring-2 ring-blue-500': ''}`}
                    >
                      <div className="text-xs font-semibold mb-1">{dayNum}</div>
                      {dayEntries.length ? (
                        <ul className="space-y-0.5">
                          {dayEntries.slice(0,3).map(e => (
                            <li key={e.id} className="text-[10px] truncate">
                              <span className={`inline-block px-1.5 py-0.5 rounded ${tipoColor[e.tipo] || 'bg-gray-300'}`}>
                                {e.tipo}{e.hora_ini? ` ${e.hora_ini}`: ''}{e.hora_fim? `-${e.hora_fim}`: ''}
                              </span>
                            </li>
                          ))}
                          {dayEntries.length > 3 ? <li className="text-[10px] text-gray-500">+{dayEntries.length-3}</li> : null}
                        </ul>
                      ) : (
                        <div className="text-[10px] text-gray-400">—</div>
                      )}
                    </button>
                  );
                })}
              </>
            );
          })()}
        </div>
        <div className="mt-2 text-xs text-gray-600">Clique em um dia para preencher abaixo.</div>

        {/* Legenda */}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="inline-flex items-center gap-1"><i className="w-3 h-3 inline-block rounded bg-blue-600"/> {labels.embarque}</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-3 inline-block rounded bg-indigo-600"/> {labels.desembarque}</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-3 inline-block rounded bg-amber-500"/> {labels.translado}</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-3 inline-block rounded bg-emerald-600"/> {labels.onshore ?? 'Onshore'}</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-3 inline-block rounded bg-cyan-600"/> {labels.offshore ?? 'Offshore'}</span>
          <span className="inline-flex items-center gap-1"><i className="w-3 h-3 inline-block rounded bg-zinc-400"/> {labels.folga ?? 'Folga'}</span>
        </div>
      </div>

      <div className="border rounded p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div>
            <label className="block text-xs mb-1">{labels.date}</label>
            <input type="date" className="w-full border rounded p-2 text-sm" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs mb-1">{labels.type}</label>
            <select className="w-full border rounded p-2 text-sm" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}>
              <option value="embarque">{labels.embarque}</option>
              <option value="desembarque">{labels.desembarque}</option>
              <option value="translado">{labels.translado}</option>
              <option value="onshore">{labels.onshore ?? 'onshore'}</option>
              <option value="offshore">{labels.offshore ?? 'offshore'}</option>
              <option value="folga">{labels.folga ?? 'folga'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">{labels.start}</label>
            <input type="time" className="w-full border rounded p-2 text-sm" value={form.hora_ini} onChange={e => setForm(f => ({...f, hora_ini: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs mb-1">{labels.end}</label>
            <input type="time" className="w-full border rounded p-2 text-sm" value={form.hora_fim} onChange={e => setForm(f => ({...f, hora_fim: e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs mb-1">{labels.note}</label>
            <input className="w-full border rounded p-2 text-sm" value={form.observacao} onChange={e => setForm(f => ({...f, observacao: e.target.value}))} />
          </div>
        </div>
        <div className="text-right">
          <button disabled={blocked || isPastDeadline || loading} className="px-3 py-2 border rounded text-sm disabled:opacity-50" onClick={onCreate}>{labels.add}</button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-2">{labels.date}</th>
              <th className="py-1 pr-2">{labels.type}</th>
              <th className="py-1 pr-2">{labels.start}</th>
              <th className="py-1 pr-2">{labels.end}</th>
              <th className="py-1 pr-2">{labels.note}</th>
              <th className="py-1 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => {
              const anns = annMap.get(e.id) || [];
              const hasField = (f: string) => anns.some(a => a.field_path === f);
              return (
                <tr key={e.id} className="border-b last:border-0">
                  <td className={"py-1 pr-2 "+(hasField('data')? 'bg-red-50' : '')}>{e.data}</td>
                  <td className={"py-1 pr-2 "+(hasField('tipo')? 'bg-red-50' : '')}>{e.tipo}</td>
                  <td className={"py-1 pr-2 "+(hasField('hora_ini')? 'bg-red-50' : '')}>{e.hora_ini ?? '-'}</td>
                  <td className={"py-1 pr-2 "+(hasField('hora_fim')? 'bg-red-50' : '')}>{e.hora_fim ?? '-'}</td>
                  <td className={"py-1 pr-2 "+(hasField('observacao')? 'bg-red-50' : '')}>{e.observacao ?? '-'}</td>
                  <td className="py-1 pr-2 text-right">
                    <button disabled={blocked || isPastDeadline || loading} onClick={() => onDelete(e.id)} className="text-red-600 underline text-xs disabled:opacity-50">{labels.delete}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {annMap.get('ts')?.length ? (
        <div className="border rounded p-3">
          <div className="font-medium mb-2">{labels.annotations}</div>
          <ul className="list-disc pl-5">
            {annMap.get('ts')!.map(a => (
              <li key={a.id}>{a.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

