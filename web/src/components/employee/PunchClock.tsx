'use client';

import { useEffect, useState } from 'react';

interface TodayPunch {
  date: string;
  open: boolean;
  horaIni: string | null;
  horaFim: string | null;
}

/** Entrada/Saída na UI do ponto. Grava pela mesma recordPunch do portal. */
export default function PunchClock() {
  const [today, setToday] = useState<TodayPunch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/employee/punch')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json && typeof json.date === 'string') setToday(json as TodayPunch);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const punch = async (kind: 'in' | 'out') => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/employee/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Falha ao registrar o ponto');
      }
      setToday({
        date: json.date,
        open: kind === 'in',
        horaIni: json.horaIni ?? null,
        horaFim: json.horaFim ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao registrar o ponto');
    } finally {
      setBusy(false);
    }
  };

  const kind = today?.open ? 'out' : 'in';

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--card-foreground)]">Registro de ponto</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {today
              ? `Hoje ${today.horaIni || '—'}${today.horaFim ? ` – ${today.horaFim}` : today.open ? ' (em aberto)' : ''}`
              : 'Carregando batida do dia…'}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => punch(kind)}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Registrando…' : kind === 'in' ? 'Registrar entrada' : 'Registrar saída'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
