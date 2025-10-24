"use client";
// Enhanced calendar with modern UI - v2.0
import React, { useState, useMemo } from 'react';

type Entry = {
  id: string;
  data: string;
  tipo: string;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
};

type WorkSchedule = {
  work_schedule: string;
  days_on: number | null;
  days_off: number | null;
  start_date: string;
};

type Props = {
  timesheetId: string;
  employeeId: string;
  periodo_ini: string;
  periodo_fim: string;
  status: string;
  initialEntries: Entry[];
  locale: string;
  workSchedule?: WorkSchedule | null;
};

export default function TimesheetCalendar({
  timesheetId,
  employeeId,
  periodo_ini,
  periodo_fim,
  status,
  initialEntries,
  locale,
  workSchedule,
}: Props) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipo: 'embarque',
    hora_ini: '',
    observacao: '',
  });

  // Calculate worker status based on work schedule
  const getWorkerStatus = (date: string): 'embarcado' | 'desembarcado' | 'unknown' => {
    if (!workSchedule) return 'unknown';

    const { work_schedule, days_on, days_off, start_date } = workSchedule;

    // Parse schedule pattern (e.g., "14x14" -> 14 days on, 14 days off)
    let onDays = days_on;
    let offDays = days_off;

    if (!onDays || !offDays) {
      if (work_schedule !== 'custom') {
        const [on, off] = work_schedule.split('x').map(Number);
        onDays = on;
        offDays = off;
      } else {
        return 'unknown';
      }
    }

    // Calculate days since start
    const startDate = new Date(start_date);
    const currentDate = new Date(date);
    const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceStart < 0) return 'unknown';

    // Calculate position in cycle
    const cycleLength = onDays + offDays;
    const positionInCycle = daysSinceStart % cycleLength;

    return positionInCycle < onDays ? 'embarcado' : 'desembarcado';
  };

  // Generate calendar days
  const days = useMemo(() => {
    const start = new Date(periodo_ini);
    const end = new Date(periodo_fim);
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
  }, [periodo_ini, periodo_fim]);

  // Get first day of month for calendar offset
  const firstDayOfWeek = useMemo(() => {
    const d = new Date(periodo_ini);
    return d.getDay();
  }, [periodo_ini]);

  // Color mapping for entry types
  const tipoColors: Record<string, string> = {
    embarque: 'bg-blue-600 text-white',
    desembarque: 'bg-indigo-600 text-white',
    translado: 'bg-amber-500 text-white',
    onshore: 'bg-emerald-600 text-white',
    offshore: 'bg-cyan-600 text-white',
    folga: 'bg-zinc-400 text-white',
  };

  const tipoLabels: Record<string, string> = {
    embarque: 'Embarque',
    desembarque: 'Desembarque',
    translado: 'Translado',
    onshore: 'Onshore',
    offshore: 'Offshore',
    folga: 'Folga',
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setShowModal(true);
    setError(null);
    // Reset form
    setForm({
      tipo: 'embarque',
      hora_ini: '',
      observacao: '',
    });
  };

  const handleCreateEntry = async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/employee/timesheets/${timesheetId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: selectedDate,
          tipo: form.tipo,
          hora_ini: form.hora_ini || null,
          hora_fim: null,
          observacao: form.observacao || null,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'create_failed' }));
        throw new Error(j.error || 'create_failed');
      }

      // Reload entries
      await reloadEntries();
      setShowModal(false);
    } catch (e: any) {
      setError(e.message || 'Erro ao criar lançamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/employee/timesheets/${timesheetId}/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('delete_failed');

      await reloadEntries();
    } catch (e) {
      alert('Erro ao excluir lançamento');
    } finally {
      setLoading(false);
    }
  };

  const reloadEntries = async () => {
    const r = await fetch(`/api/employee/timesheets/${timesheetId}`, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      setEntries(j.entries);
    }
  };

  const blocked = status !== 'draft';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="animate-slide-in-left">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-2">
          Meu Timesheet
        </h1>
        <p className="text-[var(--muted-foreground)]">
          {new Date(periodo_ini).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </p>
        {blocked && (
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 rounded-lg text-sm animate-scale-in">
            ⚠️ Este timesheet está bloqueado para edição
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/20 rounded-3xl shadow-2xl border-2 border-[var(--border)] p-8 md:p-10 animate-scale-in">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-3 mb-6">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
            <div key={i} className="text-center text-sm font-bold text-[var(--foreground)] uppercase tracking-wider py-3 bg-[var(--muted)]/50 rounded-lg">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-3">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {days.map((date) => {
            const dayNum = Number(date.split('-')[2]);
            const dayEntries = entries.filter((e) => e.data === date);
            const isToday = date === new Date().toISOString().split('T')[0];

            return (
              <button
                key={date}
                onClick={() => !blocked && handleDayClick(date)}
                disabled={blocked}
                className={`
                  relative min-h-[130px] md:min-h-[150px] p-3 rounded-2xl border-2 transition-smooth group
                  ${isToday
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-lg ring-2 ring-blue-300 dark:ring-blue-700'
                    : 'border-[var(--border)] bg-[var(--card)]'}
                  ${!blocked
                    ? 'hover:border-blue-400 hover:shadow-2xl hover:scale-[1.02] hover:z-10 cursor-pointer hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20'
                    : 'opacity-60 cursor-not-allowed'}
                  ${dayEntries.length > 0 ? 'bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/40' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xl font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--foreground)]'} group-hover:scale-110 transition-transform`}>
                    {dayNum}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-500 text-white">
                      {dayEntries.length}
                    </span>
                  )}
                </div>

                {/* Entries */}
                <div className="space-y-1.5">
                  {dayEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className={`text-xs px-2.5 py-1.5 rounded-lg ${tipoColors[entry.tipo] || 'bg-gray-400 text-white'} truncate font-medium shadow-sm`}
                    >
                      {tipoLabels[entry.tipo] || entry.tipo}
                      {entry.hora_ini && (
                        <span className="ml-1 opacity-90">• {entry.hora_ini}</span>
                      )}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-xs text-[var(--muted-foreground)] font-semibold text-center pt-1">
                      +{dayEntries.length - 3} mais
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Legenda:</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(tipoLabels).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${tipoColors[key]}`} />
                <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[var(--card)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--border)] animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  {new Date(selectedDate).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Worker Status Badge */}
              {(() => {
                const workerStatus = getWorkerStatus(selectedDate);
                if (workerStatus === 'unknown') return null;

                const isEmbarcado = workerStatus === 'embarcado';
                return (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${isEmbarcado ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isEmbarcado ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      )}
                    </svg>
                    <span className="font-semibold text-sm">
                      {isEmbarcado ? '🚢 Embarcado' : '🏠 Desembarcado'}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Existing entries for this day */}
              {entries.filter((e) => e.data === selectedDate).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Lançamentos existentes:</h3>
                  <div className="space-y-2">
                    {entries
                      .filter((e) => e.data === selectedDate)
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-[var(--muted)]/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className={`inline-block px-3 py-1 rounded-md text-sm ${tipoColors[entry.tipo]}`}>
                              {tipoLabels[entry.tipo]}
                            </div>
                            {entry.hora_ini && (
                              <span className="ml-2 text-sm text-[var(--muted-foreground)]">
                                {entry.hora_ini}
                              </span>
                            )}
                            {entry.observacao && (
                              <p className="text-xs text-[var(--muted-foreground)] mt-1">{entry.observacao}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={loading}
                            className="ml-4 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Add new entry form */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Adicionar novo lançamento:</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Tipo de Lançamento
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      {Object.entries(tipoLabels).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Hora da Marcação
                    </label>
                    <input
                      type="time"
                      value={form.hora_ini}
                      onChange={(e) => setForm({ ...form, hora_ini: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="00:00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Observações (opcional)
                    </label>
                    <textarea
                      value={form.observacao}
                      onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder="Adicione observações sobre este lançamento..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--border)] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEntry}
                disabled={loading}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Adicionar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

