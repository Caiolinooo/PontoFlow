"use client";
// Optimized TimesheetCalendar - Refactored for better performance
import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { useTranslations } from 'next-intl';

// Lazy load components to improve initial load time
const CalendarGrid = lazy(() => import('./CalendarGrid'));
const TimesheetModal = lazy(() => import('./TimesheetModal'));
const LoadingSkeleton = lazy(() => import('../ui/LoadingSkeleton'));

// Types
type Entry = {
  id: string;
  data: string;
  hora_ini?: string | null;
  hora_fim?: string | null;
  observacao?: string | null;
  environment_id?: string | null;
};

type Environment = {
  id: string;
  name: string;
  slug: string;
  color?: string;
  auto_fill_enabled?: boolean;
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
  tenantWorkMode?: 'offshore' | 'standard' | 'flexible';
};

// Batch operation types
type PendingOperation =
  | { type: 'create'; tempId: string; entry: Omit<Entry, 'id'> }
  | { type: 'delete'; entryId: string };

// Hook for batch operations logic
function useBatchOperations(
  timesheetId: string,
  initialEntries: Entry[],
  onEntriesUpdate: (entries: Entry[]) => void
) {
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reloadEntries = async () => {
    try {
      const response = await fetch(`/api/employee/timesheets/${timesheetId}`, { 
        cache: 'no-store' 
      });
      if (response.ok) {
        const data = await response.json();
        onEntriesUpdate(data.entries);
      }
    } catch (error) {
      console.error('Error reloading entries:', error);
    }
  };

  const syncPendingOperations = async () => {
    if (pendingOperations.length === 0) return;

    const operationsToSync = [...pendingOperations];
    setIsSyncing(true);

    // Remove operations from queue immediately (optimistic)
    setPendingOperations(ops =>
      ops.filter(op => !operationsToSync.some(syncOp =>
        (syncOp.type === 'create' && op.type === 'create' && syncOp.tempId === op.tempId) ||
        (syncOp.type === 'delete' && op.type === 'delete' && syncOp.entryId === op.entryId)
      ))
    );

    try {
      const creates = operationsToSync.filter(op => op.type === 'create') as Extract<PendingOperation, { type: 'create' }>[];
      const deletes = operationsToSync.filter(op => op.type === 'delete') as Extract<PendingOperation, { type: 'delete' }>[];

      const promises: Promise<any>[] = [];
      const results = {
        deletedCount: 0,
        createdCount: 0,
        errors: [] as string[],
      };

      // Execute deletes in parallel
      if (deletes.length > 0) {
        const deletePromises = deletes.map(op =>
          fetch(`/api/employee/timesheets/${timesheetId}/entries/${op.entryId}`, {
            method: 'DELETE',
          }).then(res => {
            if (res.ok) {
              results.deletedCount++;
            } else {
              results.errors.push(`Failed to delete ${op.entryId}`);
            }
            return res;
          }).catch(err => {
            results.errors.push(`Error deleting ${op.entryId}: ${err.message}`);
          })
        );
        promises.push(...deletePromises);
      }

      // Execute creates (single batch request)
      if (creates.length > 0) {
        const entriesToCreate = creates.map(op => ({
          data: op.entry.data,
          environment_id: op.entry.environment_id,
          hora_ini: op.entry.hora_ini,
          hora_fim: op.entry.hora_fim,
          observacao: op.entry.observacao,
        }));

        const createPromise = fetch(`/api/employee/timesheets/${timesheetId}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: entriesToCreate }),
        }).then(async res => {
          if (res.ok) {
            const result = await res.json();
            results.createdCount = result.count || creates.length;
            return result;
          } else {
            results.errors.push('Batch create failed');
            throw new Error('Batch create failed');
          }
        }).catch(err => {
          results.errors.push(`Error creating entries: ${err.message}`);
        });

        promises.push(createPromise);
      }

      await Promise.all(promises);

      // Reload entries from server to get real IDs
      await reloadEntries();

    } catch (error) {
      console.error('Sync failed:', error);
      // Re-add failed operations back to queue
      setPendingOperations(ops => [...ops, ...operationsToSync]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync with debounce
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    if (pendingOperations.length > 0 && !isSyncing) {
      syncTimeoutRef.current = setTimeout(() => {
        syncPendingOperations();
      }, 2000);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [pendingOperations.length, isSyncing]);

  return {
    pendingOperations,
    isSyncing,
    setPendingOperations,
    syncPendingOperations,
  };
}

// Hook for calendar utilities
function useCalendarUtils(periodo_ini: string, periodo_fim: string) {
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

  const firstDayOfWeek = useMemo(() => {
    const d = new Date(periodo_ini);
    return d.getDay();
  }, [periodo_ini]);

  return { days, firstDayOfWeek };
}

export default function TimesheetCalendar({
  timesheetId,
  employeeId,
  periodo_ini,
  periodo_fim,
  status,
  initialEntries,
  locale,
  workSchedule,
  tenantWorkMode = 'standard',
}: Props) {
  const t = useTranslations('admin.myTimesheet');
  
  // State management
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [suggestedEntries, setSuggestedEntries] = useState<Array<{date: string; environment_id: string; selected: boolean}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');

  // Form state
  const [form, setForm] = useState({
    environment_id: '',
    hora_ini: '',
    observacao: '',
  });

  // Custom hooks
  const { days, firstDayOfWeek } = useCalendarUtils(periodo_ini, periodo_fim);
  const { pendingOperations, isSyncing, setPendingOperations, syncPendingOperations } = useBatchOperations(
    timesheetId, 
    initialEntries, 
    setEntries
  );

  // Load environments on mount
  useEffect(() => {
    async function loadEnvironments() {
      try {
        const response = await fetch('/api/employee/environments');
        if (response.ok) {
          const data = await response.json();
          setEnvironments(data.environments || []);
        }
      } catch (error) {
        console.error('Error loading environments:', error);
      }
    }
    loadEnvironments();
  }, []);

  // Event handlers
  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setShowModal(true);
    setError(null);
    setForm({
      environment_id: '',
      hora_ini: '',
      observacao: '',
    });
    setSelectedEnvironment('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    
    // Clear auto-sync timeout and sync immediately if needed
    if (pendingOperations.length > 0) {
      syncPendingOperations();
    }
  };

  const blocked = status !== 'draft';

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in">
      {/* Syncing indicator */}
      {isSyncing && (
        <div className="fixed top-4 right-4 z-50 p-3 bg-green-500 text-white rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-right">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">{t('batchOperations.saving')}</span>
        </div>
      )}

      {/* Header */}
      <div className="animate-slide-in-left">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] mb-1">
          {t('title')}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {new Date(periodo_ini).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </p>
        {blocked && (
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 rounded-lg text-xs sm:text-sm animate-scale-in">
            {t('blocked')}
          </div>
        )}
      </div>

      {/* Calendar Grid - Lazy loaded */}
      <Suspense fallback={<LoadingSkeleton lines={8} />}>
        <CalendarGrid
          days={days}
          entries={entries}
          firstDayOfWeek={firstDayOfWeek}
          periodo_ini={periodo_ini}
          isBlocked={blocked}
          onDayClick={handleDayClick}
          environments={environments}
          locale={locale}
        />
      </Suspense>

      {/* Modal - Lazy loaded */}
      {showModal && selectedDate && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--card)] rounded-2xl p-6">
            <LoadingSkeleton lines={5} />
          </div>
        </div>}>
          <TimesheetModal
            isOpen={showModal}
            selectedDate={selectedDate}
            entries={entries}
            environments={environments}
            workSchedule={workSchedule}
            tenantWorkMode={tenantWorkMode}
            form={form}
            setForm={setForm}
            selectedEnvironment={selectedEnvironment}
            setSelectedEnvironment={setSelectedEnvironment}
            error={error}
            setError={setError}
            loading={loading}
            pendingOperations={pendingOperations}
            onClose={handleCloseModal}
            onEntriesUpdate={setEntries}
            onSetPendingOperations={setPendingOperations}
            locale={locale}
            timesheetId={timesheetId}
          />
        </Suspense>
      )}
    </div>
  );
}