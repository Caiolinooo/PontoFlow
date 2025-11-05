"use client";
// Enhanced calendar with modern UI - v2.0
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

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
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [suggestedEntries, setSuggestedEntries] = useState<Array<{date: string; environment_id: string; selected: boolean}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('');

  // Batch operations queue
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [form, setForm] = useState({
    environment_id: '',
    hora_ini: '',
    observacao: '',
  });

  // Load environments on mount
  useEffect(() => {
    async function loadEnvironments() {
      try {
        const res = await fetch('/api/employee/environments');
        if (res.ok) {
          const data = await res.json();
          setEnvironments(data.environments || []);
        }
      } catch (err) {
        console.error('Error loading environments:', err);
      }
    }
    loadEnvironments();
  }, []);

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

  /**
   * Calculate suggested entries based on work schedule
   *
   * LÓGICA CORRETA:
   * - EMBARQUE (dia X): Dia da viagem para o trabalho
   *   → Dias X+1 até X+N: Regime Offshore (trabalhando)
   *   → Dia X+N+1: Desembarque (volta para casa)
   *   → Dias X+N+2 até X+N+M+1: Folga (em casa)
   *   → Dia X+N+M+2: Próximo embarque (se não houver dobra)
   *
   * - DESEMBARQUE (dia Y): Dia da volta para casa
   *   → Dias Y+1 até Y+M: Folga (em casa)
   *   → Dia Y+M+1: Próximo embarque (sugestão)
   *
   * Onde N = days_on (ex: 28) e M = days_off (ex: 28)
   */
  const calculateSuggestedEntries = (startDate: string, startTipo: 'embarque' | 'desembarque'): Array<{date: string; environment_id: string; selected: boolean}> => {
    if (!workSchedule) return [];

    const { work_schedule, days_on, days_off } = workSchedule;

    let onDays = days_on;
    let offDays = days_off;

    if (!onDays || !offDays) {
      if (work_schedule !== 'custom') {
        const [on, off] = work_schedule.split('x').map(Number);
        onDays = on;
        offDays = off;
      } else {
        return [];
      }
    }

    // Find environment IDs for each type
    const embarqueEnv = environments.find(e => e.slug === 'embarque');
    const desembarqueEnv = environments.find(e => e.slug === 'desembarque');
    const offshoreEnv = environments.find(e => e.slug === 'offshore' || e.slug === 'regime-offshore');
    const folgaEnv = environments.find(e => e.slug === 'folga');

    if (!offshoreEnv || !folgaEnv) {
      console.warn('Missing required environments (offshore or folga)');
      return [];
    }

    const suggestions: Array<{date: string; environment_id: string; selected: boolean}> = [];
    const start = new Date(startDate);

    // Extend period to next 6 months to allow cross-month suggestions
    const periodEnd = new Date(periodo_fim);
    periodEnd.setMonth(periodEnd.getMonth() + 6);

    let currentDate = new Date(start);
    currentDate.setDate(currentDate.getDate() + 1); // Start from next day

    if (startTipo === 'embarque') {
      // EMBARQUE: User is boarding, so they will work offshore
      // Days 1 to N: Offshore (working)
      for (let i = 0; i < onDays; i++) {
        if (currentDate > periodEnd) break;

        const dateStr = currentDate.toISOString().split('T')[0];
        const existingEntry = entries.find(e => e.data === dateStr);

        if (!existingEntry) {
          suggestions.push({
            date: dateStr,
            environment_id: offshoreEnv.id,
            selected: true // Pre-selected by default
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Day N+1: Desembarque (return home)
      if (currentDate <= periodEnd && desembarqueEnv) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingEntry = entries.find(e => e.data === dateStr);

        if (!existingEntry) {
          suggestions.push({
            date: dateStr,
            environment_id: desembarqueEnv.id,
            selected: true
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Days N+2 to N+M+1: Folga (days off at home)
      for (let i = 0; i < offDays; i++) {
        if (currentDate > periodEnd) break;

        const dateStr = currentDate.toISOString().split('T')[0];
        const existingEntry = entries.find(e => e.data === dateStr);

        if (!existingEntry) {
          suggestions.push({
            date: dateStr,
            environment_id: folgaEnv.id,
            selected: false // Not pre-selected - user might have changes
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Day N+M+2: Next embarque (suggestion only)
      if (currentDate <= periodEnd && embarqueEnv) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingEntry = entries.find(e => e.data === dateStr);

        if (!existingEntry) {
          suggestions.push({
            date: dateStr,
            environment_id: embarqueEnv.id,
            selected: false // Not pre-selected - might be a "dobra" or cancelled
          });
        }
      }

    } else {
      // DESEMBARQUE: User is returning home, so they will be on days off
      // Days 1 to M: Folga (days off at home)
      for (let i = 0; i < offDays; i++) {
        if (currentDate > periodEnd) break;

        const dateStr = currentDate.toISOString().split('T')[0];
        const existingEntry = entries.find(e => e.data === dateStr);

        if (!existingEntry) {
          suggestions.push({
            date: dateStr,
            environment_id: folgaEnv.id,
            selected: true // Pre-selected by default
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Day M+1: Next embarque (suggestion only)
      if (currentDate <= periodEnd && embarqueEnv) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const existingEntry = entries.find(e => e.data === dateStr);

        if (!existingEntry) {
          suggestions.push({
            date: dateStr,
            environment_id: embarqueEnv.id,
            selected: false // Not pre-selected - might be cancelled or delayed
          });
        }
      }
    }

    // Sort suggestions by date
    suggestions.sort((a, b) => a.date.localeCompare(b.date));

    return suggestions;
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

  // Get environment by ID
  const getEnvironment = (envId: string | null | undefined): Environment | null => {
    if (!envId) return null;
    return environments.find(e => e.id === envId) || null;
  };

  // Get color for environment
  const getEnvironmentColor = (envId: string | null | undefined): string => {
    const env = getEnvironment(envId);
    return env?.color || '#3B82F6';
  };

  // Get name for environment
  const getEnvironmentName = (envId: string | null | undefined): string => {
    const env = getEnvironment(envId);
    return env?.name || 'N/A';
  };

  const handleDayClick = (date: string) => {
    const dayEntries = entries.filter(e => e.data === date);
    console.log(`📅 [Calendar] Clicked on ${date} - Found ${dayEntries.length} entries:`, dayEntries);
    setSelectedDate(date);
    setShowModal(true);
    setError(null);
    // Reset form - leave environment_id empty to force user selection
    setForm({
      environment_id: '',
      hora_ini: '',
      observacao: '',
    });
    setSelectedEnvironment('');
  };

  const handleCreateEntry = async () => {
    if (!selectedDate || !form.environment_id) {
      setError(t('batchOperations.selectEnvironment'));
      return;
    }

    // Get selected environment
    const selectedEnv = getEnvironment(form.environment_id);

    // Check if environment has auto-fill enabled and if it's embarque/desembarque
    const isTransitionEnvironment = selectedEnv?.slug === 'embarque' || selectedEnv?.slug === 'desembarque';

    // Only show auto-fill for offshore work mode
    const shouldShowAutoFill =
      tenantWorkMode === 'offshore' &&
      selectedEnv?.auto_fill_enabled &&
      isTransitionEnvironment &&
      workSchedule;

    if (shouldShowAutoFill) {
      // Show auto-fill modal for embarque/desembarque (offshore mode only)
      const suggestions = calculateSuggestedEntries(selectedDate, selectedEnv.slug as 'embarque' | 'desembarque');
      setSuggestedEntries(suggestions);
      setShowAutoFillModal(true);
    } else {
      // Create single entry without auto-fill
      // This is used for:
      // - Standard work mode (daily clock-in/out)
      // - Flexible work mode
      // - Offshore mode but not embarque/desembarque
      await createSingleEntry();
    }
  };

  const createSingleEntry = () => {
    if (!selectedDate) return;

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
    setPendingOperations(ops => [...ops, {
      type: 'create',
      tempId,
      entry: newEntry
    }]);

    // Add to UI immediately (optimistic update)
    setEntries([...entries, newEntry]);

    // Reset form
    setForm({
      environment_id: '',
      hora_ini: '',
      observacao: '',
    });

    // Don't close modal - user can add more entries
  };

  const handleConfirmAutoFill = () => {
    if (!selectedDate) return;

    setError(null);

    // Prepare all entries for batch insert
    const selectedSuggestions = suggestedEntries.filter(s => s.selected);

    // Include the initial entry + all selected suggestions
    const allEntriesToCreate = [
      {
        data: selectedDate,
        environment_id: form.environment_id,
        hora_ini: form.hora_ini || null,
        hora_fim: null,
        observacao: form.observacao || null,
      },
      ...selectedSuggestions.map(suggestion => ({
        data: suggestion.date,
        environment_id: suggestion.environment_id,
        hora_ini: form.hora_ini || null,
        hora_fim: null,
        observacao: `Auto-gerado pela escala ${workSchedule?.work_schedule}`,
      }))
    ];

    console.log(`📦 Adding ${allEntriesToCreate.length} entries to batch queue...`);

    // Add all entries to pending operations and UI
    const newOperations: PendingOperation[] = [];
    const newEntries: Entry[] = [];

    allEntriesToCreate.forEach(entryData => {
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      const newEntry: Entry = {
        id: tempId,
        ...entryData,
      };

      newOperations.push({ type: 'create', tempId, entry: newEntry });
      newEntries.push(newEntry);
    });

    // Add to pending operations
    setPendingOperations(ops => [...ops, ...newOperations]);

    // Add to UI immediately (optimistic update)
    setEntries([...entries, ...newEntries]);

    // Close modals
    setShowModal(false);
    setShowAutoFillModal(false);
    setSuggestedEntries([]);

    // Reset form
    setForm({
      environment_id: '',
      hora_ini: '',
      observacao: '',
    });

    console.log(`✅ ${allEntriesToCreate.length} entries added to queue. Will sync when modal closes.`);
  };

  const handleDeleteEntry = (entryId: string) => {
    // No confirmation needed - user will confirm when closing modal

    // Check if this is a temporary entry (not yet saved to server)
    const isTempEntry = entryId.startsWith('temp-');

    if (isTempEntry) {
      // Remove from pending operations (cancel the create)
      setPendingOperations(ops => ops.filter(op =>
        !(op.type === 'create' && op.tempId === entryId)
      ));
      // Remove from UI immediately
      setEntries(entries.filter(e => e.id !== entryId));
    } else {
      // Check if already in delete queue (prevent duplicates)
      const alreadyQueued = pendingOperations.some(
        op => op.type === 'delete' && op.entryId === entryId
      );

      if (!alreadyQueued) {
        // Add delete operation to queue
        setPendingOperations(ops => [...ops, { type: 'delete', entryId }]);
      }

      // Remove from UI immediately (optimistic update)
      setEntries(entries.filter(e => e.id !== entryId));
    }
  };

  const reloadEntries = async () => {
    const r = await fetch(`/api/employee/timesheets/${timesheetId}`, { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      setEntries(j.entries);
    }
  };

  // Sync all pending operations to server (fully async, non-blocking)
  const syncPendingOperations = async () => {
    if (pendingOperations.length === 0) return;

    // Capture current operations to sync (snapshot)
    // This allows new operations to be queued while syncing
    const operationsToSync = [...pendingOperations];

    setIsSyncing(true);
    console.log(`🔄 Syncing ${operationsToSync.length} pending operations in background...`);
    const startTime = Date.now();

    // Remove operations from queue immediately (optimistic)
    setPendingOperations(ops =>
      ops.filter(op => !operationsToSync.some(syncOp =>
        (syncOp.type === 'create' && op.type === 'create' && syncOp.tempId === op.tempId) ||
        (syncOp.type === 'delete' && op.type === 'delete' && syncOp.entryId === op.entryId)
      ))
    );

    try {
      // Separate creates and deletes
      const creates = operationsToSync.filter(op => op.type === 'create') as Extract<PendingOperation, { type: 'create' }>[];
      const deletes = operationsToSync.filter(op => op.type === 'delete') as Extract<PendingOperation, { type: 'delete' }>[];

      // Execute deletes and creates in parallel for maximum speed
      const promises: Promise<any>[] = [];
      const results = {
        deletedCount: 0,
        createdCount: 0,
        errors: [] as string[],
      };

      // Execute deletes in parallel (each is a separate HTTP request)
      if (deletes.length > 0) {
        console.log(`🗑️ Batch deleting ${deletes.length} entries in parallel...`);
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
        console.log(`➕ Batch creating ${creates.length} entries...`);
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
            try {
              const result = await res.json();
              results.createdCount = result.count || creates.length;
              console.log(`✅ Created ${results.createdCount} entries`);
              return result;
            } catch (parseError) {
              console.error('❌ Failed to parse success response:', parseError);
              results.errors.push('Failed to parse server response');
              throw parseError;
            }
          } else {
            // Try to parse error response
            let errorMessage = 'Batch create failed';
            try {
              const errorData = await res.json();
              errorMessage = errorData.error || errorMessage;
              console.error('❌ Server error:', errorData);
            } catch (parseError) {
              console.error('❌ Failed to parse error response:', parseError);
            }
            results.errors.push(errorMessage);
            throw new Error(errorMessage);
          }
        }).catch(err => {
          console.error('❌ Create request failed:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          if (!results.errors.includes(errorMsg)) {
            results.errors.push(`Error creating entries: ${errorMsg}`);
          }
        });

        promises.push(createPromise);
      }

      // Wait for all operations to complete
      await Promise.all(promises);

      const duration = Date.now() - startTime;
      console.log(`✅ Sync completed in ${duration}ms`);
      console.log(`   - ${results.deletedCount}/${deletes.length} deletions successful`);
      console.log(`   - ${results.createdCount}/${creates.length} creations successful`);

      if (results.errors.length > 0) {
        console.warn(`⚠️ ${results.errors.length} errors occurred:`, results.errors);
      }

      // Reload entries from server to get real IDs (silent, in background)
      await reloadEntries();

      // Show errors if any (non-blocking)
      if (results.errors.length > 0) {
        console.error('Sync errors:', results.errors);
        // Don't show alert - just log to console
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      // Re-add failed operations back to queue
      setPendingOperations(ops => [...ops, ...operationsToSync]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync with debounce (2 seconds after last change)
  useEffect(() => {
    // Clear existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // If there are pending operations and not currently syncing
    if (pendingOperations.length > 0 && !isSyncing) {
      // Schedule sync after 2 seconds of inactivity
      syncTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Auto-syncing after 2s of inactivity...');
        syncPendingOperations();
      }, 2000);
    }

    // Cleanup on unmount
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [pendingOperations.length, isSyncing]);

  // Sync when modal closes
  const handleCloseModal = () => {
    setShowModal(false);

    // Clear auto-sync timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Sync immediately if there are pending operations
    if (pendingOperations.length > 0) {
      syncPendingOperations();
    }
  };

  // Check if we can edit based on status and period deadline
  const isAfterDeadline = () => {
    try {
      // Check if current date is after the timesheet period end
      const periodEnd = new Date(periodo_fim);
      const today = new Date();
      return today > periodEnd;
    } catch (error) {
      console.warn('Error checking deadline:', error);
      return false;
    }
  };

  // Allow editing if status is 'draft', 'rejected', OR if we're after the period deadline
  // This ensures users can edit timesheets even after period end (e.g., after day 16 for ABZ Group)
  // REJECTED timesheets MUST be editable so users can correct and resubmit
  const canEditTimesheet = status === 'draft' || status === 'rejected' || isAfterDeadline();
  const blocked = !canEditTimesheet;

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in">
      {/* Syncing indicator (outside modal, top of page) */}
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
        {blocked && !isAfterDeadline() && (
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200 rounded-lg text-xs sm:text-sm animate-scale-in">
            {t('blocked')}
          </div>
        )}
        {isAfterDeadline() && (
          <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 rounded-lg text-xs sm:text-sm animate-scale-in">
            ⚠️ Período fechado - Você pode editar até que seu gestor aprove ou feche o período
          </div>
        )}
        {status === 'rejected' && (
          <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 rounded-lg text-xs sm:text-sm border-2 border-red-300 dark:border-red-700 animate-scale-in">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-bold mb-1">❌ TIMESHEET RECUSADO</p>
                <p className="text-xs opacity-90">
                  Seu timesheet foi recusado pelo gestor. Por favor, corrija os problemas apontados e reenvie.
                  Verifique os alertas no dashboard para mais detalhes sobre o motivo da recusa.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/20 rounded-lg shadow-lg border border-[var(--border)] p-2 sm:p-3 animate-scale-in">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
          {[t('weekdays.sun'), t('weekdays.mon'), t('weekdays.tue'), t('weekdays.wed'), t('weekdays.thu'), t('weekdays.fri'), t('weekdays.sat')].map((day, i) => (
            <div key={i} className="text-center text-[10px] sm:text-xs font-bold text-[var(--foreground)] uppercase tracking-wide py-1 sm:py-1.5 bg-[var(--muted)]/50 rounded">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {days.map((date) => {
            const dayNum = Number(date.split('-')[2]);
            const dayEntries = entries
              .filter((e) => e.data === date)
              .sort((a, b) => {
                // Sort by hora_ini (start time) - entries without time go last
                const timeA = a.hora_ini || '99:99';
                const timeB = b.hora_ini || '99:99';
                return timeA.localeCompare(timeB);
              });
            const isToday = date === new Date().toISOString().split('T')[0];

            return (
              <button
                key={date}
                onClick={() => !blocked && handleDayClick(date)}
                disabled={blocked}
                className={`
                  relative aspect-square w-full p-1 sm:p-1.5 rounded border transition-all group flex flex-col
                  ${isToday
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 shadow-sm ring-1 ring-blue-300 dark:ring-blue-700'
                    : 'border-[var(--border)] bg-[var(--card)]'}
                  ${!blocked
                    ? 'hover:border-blue-400 hover:shadow-md hover:scale-[1.02] hover:z-10 cursor-pointer hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/20'
                    : 'opacity-60 cursor-not-allowed'}
                  ${dayEntries.length > 0 ? 'bg-gradient-to-br from-[var(--card)] to-[var(--muted)]/40' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-0.5 sm:mb-1">
                  <span className={`text-xs sm:text-sm font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--foreground)]'}`}>
                    {dayNum}
                  </span>
                  {dayEntries.length > 0 && (
                    <span className="text-[8px] sm:text-[10px] font-semibold px-1 py-0.5 rounded-full bg-blue-500 text-white leading-none">
                      {dayEntries.length}
                    </span>
                  )}
                </div>

                {/* Entries */}
                <div className="space-y-0.5 flex-1 overflow-hidden">
                  {dayEntries.slice(0, 5).map((entry) => {
                    const envColor = getEnvironmentColor(entry.environment_id);
                    const envName = getEnvironmentName(entry.environment_id);
                    return (
                      <div
                        key={entry.id}
                        className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded truncate font-medium text-white"
                        style={{ backgroundColor: envColor }}
                      >
                        <span className="hidden md:inline">{envName}</span>
                        <span className="md:hidden">{envName.substring(0, 3)}</span>
                        {entry.hora_ini && (
                          <span className="ml-0.5 opacity-90 hidden lg:inline text-[8px]">• {entry.hora_ini}</span>
                        )}
                      </div>
                    );
                  })}
                  {dayEntries.length > 5 && (
                    <div className="text-[8px] sm:text-[10px] text-[var(--muted-foreground)] font-semibold text-center">
                      +{dayEntries.length - 5}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend - Environments */}
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <h3 className="text-xs sm:text-sm font-semibold text-[var(--foreground)] mb-2">{t('legend')}</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {environments.map((env) => (
              <div key={env.id} className="flex items-center gap-1 sm:gap-1.5">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: env.color || '#3B82F6' }}
                />
                <span className="text-xs sm:text-sm text-[var(--muted-foreground)]">{env.name}</span>
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
                  onClick={handleCloseModal}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Worker Status Badge - Only show if there are entries for this day */}
              {(() => {
                // Get entries for selected date
                const dayEntries = entries.filter(e => e.data === selectedDate);

                // Only show status if there are entries
                if (dayEntries.length === 0) return null;

                // Determine status based on actual entries
                const hasOffshoreEntry = dayEntries.some(e => {
                  const env = environments.find(env => env.id === e.environment_id);
                  return env?.slug === 'offshore';
                });

                const hasEmbarqueEntry = dayEntries.some(e => {
                  const env = environments.find(env => env.id === e.environment_id);
                  return env?.slug === 'embarque';
                });

                const hasDesembarqueEntry = dayEntries.some(e => {
                  const env = environments.find(env => env.id === e.environment_id);
                  return env?.slug === 'desembarque';
                });

                const hasFolgaEntry = dayEntries.some(e => {
                  const env = environments.find(env => env.id === e.environment_id);
                  return env?.slug === 'folga';
                });

                // Determine badge based on entries
                let badgeText = '';
                let badgeColor = '';
                let badgeIcon = null;

                if (hasOffshoreEntry || hasEmbarqueEntry) {
                  badgeText = t('workerStatus.embarcado');
                  badgeColor = 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-200';
                  badgeIcon = (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  );
                } else if (hasDesembarqueEntry || hasFolgaEntry) {
                  badgeText = t('workerStatus.desembarcado');
                  badgeColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
                  badgeIcon = (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  );
                } else {
                  // Has entries but not offshore-related, don't show badge
                  return null;
                }

                return (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${badgeColor}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {badgeIcon}
                    </svg>
                    <span className="font-semibold text-sm">
                      {badgeText}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Pending operations indicator */}
              {pendingOperations.length > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2 border border-blue-200 dark:border-blue-800">
                  <svg className="w-4 h-4 flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-medium">
                      {t('batchOperations.pendingChanges', { count: pendingOperations.length })} •
                      {' '}{t('batchOperations.creates', { count: pendingOperations.filter(op => op.type === 'create').length })} •
                      {' '}{t('batchOperations.deletes', { count: pendingOperations.filter(op => op.type === 'delete').length })}
                    </p>
                    <p className="text-xs opacity-75 mt-0.5">
                      {t('batchOperations.autoSaveIn')}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Existing entries for this day */}
              {entries.filter((e) => e.data === selectedDate).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">{t('existingEntries')}</h3>
                  <div className="space-y-2">
                    {entries
                      .filter((e) => e.data === selectedDate)
                      .sort((a, b) => {
                        // Sort by hora_ini (start time) - entries without time go last
                        const timeA = a.hora_ini || '99:99';
                        const timeB = b.hora_ini || '99:99';
                        return timeA.localeCompare(timeB);
                      })
                      .map((entry) => {
                        const envColor = getEnvironmentColor(entry.environment_id);
                        const envName = getEnvironmentName(entry.environment_id);
                        const isTempEntry = entry.id.startsWith('temp-');
                        return (
                          <div
                            key={entry.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              isTempEntry
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                                : 'bg-[var(--muted)]/50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="inline-block px-3 py-1 rounded-md text-sm text-white font-medium"
                                  style={{ backgroundColor: envColor }}
                                >
                                  {envName}
                                </div>
                                {isTempEntry && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Pendente
                                  </span>
                                )}
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
                              className="ml-4 p-2 rounded-lg text-[var(--destructive)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                              aria-label="Excluir entrada"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Add new entry form */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">{t('addNewEntry')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      {t('batchOperations.environmentLabel')}
                    </label>
                    <select
                      value={form.environment_id}
                      onChange={(e) => {
                        setForm({ ...form, environment_id: e.target.value });
                        setSelectedEnvironment(e.target.value);
                      }}
                      className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">{t('batchOperations.environmentPlaceholder')}</option>
                      {environments.map((env) => (
                        <option key={env.id} value={env.id}>
                          {env.name}
                        </option>
                      ))}
                    </select>
                    {environments.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Nenhum ambiente cadastrado. Entre em contato com o administrador.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      {t('time')}
                    </label>
                    <input
                      type="time"
                      value={form.hora_ini}
                      onChange={(e) => setForm({ ...form, hora_ini: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={t('timePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      {t('notes')}
                    </label>
                    <textarea
                      value={form.observacao}
                      onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      placeholder={t('notesPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--border)] flex items-center justify-between gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
              >
                {t('batchOperations.close')}
              </button>
              <button
                onClick={handleCreateEntry}
                disabled={loading || !form.environment_id}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('saving') : t('batchOperations.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-fill Confirmation Modal */}
      {showAutoFillModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[var(--card)] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-[var(--border)] animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                {t('autoFill.title')}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t('autoFill.subtitle', { schedule: workSchedule?.work_schedule || '' })}
              </p>
              <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 rounded-lg text-sm">
                {t('autoFill.warning')}
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {t('autoFill.suggestedEntries')}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSuggestedEntries(suggestedEntries.map(s => ({ ...s, selected: true })))}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-medium transition-colors"
                  >
                    {t('autoFill.selectAll')}
                  </button>
                  <button
                    onClick={() => setSuggestedEntries(suggestedEntries.map(s => ({ ...s, selected: false })))}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 text-[var(--foreground)] font-medium transition-colors"
                  >
                    {t('autoFill.deselectAll')}
                  </button>
                </div>
              </div>

              {/* Info banner based on type */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  {form.environment_id && getEnvironment(form.environment_id)?.slug === 'embarque'
                    ? t('autoFill.embarqueInfo')
                    : t('autoFill.desembarqueInfo')
                  }
                </p>
              </div>

              <div className="space-y-6">
                {/* Working Days (Offshore) - Pre-selected */}
                {suggestedEntries.filter(s => {
                  const env = getEnvironment(s.environment_id);
                  return env?.slug === 'offshore';
                }).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-3 h-3 bg-cyan-500 rounded-full"></span>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        {t('autoFill.workingDays')}
                      </h4>
                      <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                        {suggestedEntries.filter(s => {
                          const env = getEnvironment(s.environment_id);
                          return env?.slug === 'offshore' && s.selected;
                        }).length} selecionados
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">
                      {t('autoFill.workingDaysHelp')}
                    </p>
                    <div className="space-y-2">
                      {suggestedEntries
                        .map((suggestion, index) => ({ ...suggestion, originalIndex: index }))
                        .filter(s => {
                          const env = getEnvironment(s.environment_id);
                          return env?.slug === 'offshore';
                        })
                        .map((suggestion) => {
                          const env = getEnvironment(suggestion.environment_id);
                          return (
                            <div
                              key={suggestion.originalIndex}
                              className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors border border-cyan-200 dark:border-cyan-800"
                            >
                              <input
                                type="checkbox"
                                checked={suggestion.selected}
                                onChange={(e) => {
                                  const newSuggestions = [...suggestedEntries];
                                  newSuggestions[suggestion.originalIndex].selected = e.target.checked;
                                  setSuggestedEntries(newSuggestions);
                                }}
                                className="w-5 h-5 rounded border-[var(--border)] text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-[var(--foreground)]">
                                    {new Date(suggestion.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <div className="inline-block px-3 py-1 rounded-md text-xs bg-blue-100 text-blue-800">
                                    {env?.slug || 'offshore'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Desembarque - Pre-selected */}
                {suggestedEntries.filter(s => {
                  const env = getEnvironment(s.environment_id);
                  return env?.slug === 'desembarque';
                }).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-3 h-3 bg-purple-500 rounded-full"></span>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        Desembarque (Volta para Casa)
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {suggestedEntries
                        .map((suggestion, index) => ({ ...suggestion, originalIndex: index }))
                        .filter(s => {
                          const env = getEnvironment(s.environment_id);
                          return env?.slug === 'desembarque';
                        })
                        .map((suggestion) => {
                          const env = getEnvironment(suggestion.environment_id);
                          return (
                            <div
                              key={suggestion.originalIndex}
                              className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-200 dark:border-purple-800"
                            >
                              <input
                                type="checkbox"
                                checked={suggestion.selected}
                                onChange={(e) => {
                                  const newSuggestions = [...suggestedEntries];
                                  newSuggestions[suggestion.originalIndex].selected = e.target.checked;
                                  setSuggestedEntries(newSuggestions);
                                }}
                                className="w-5 h-5 rounded border-[var(--border)] text-purple-600 focus:ring-2 focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-[var(--foreground)]">
                                    {new Date(suggestion.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <div className="inline-block px-3 py-1 rounded-md text-xs bg-purple-100 text-purple-800">
                                    {env?.slug || 'desembarque'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Days Off (Folga) - Pre-selected */}
                {suggestedEntries.filter(s => {
                  const env = getEnvironment(s.environment_id);
                  return env?.slug === 'folga';
                }).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-3 h-3 bg-gray-500 rounded-full"></span>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        {t('autoFill.daysOff')}
                      </h4>
                      <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                        {suggestedEntries.filter(s => {
                          const env = getEnvironment(s.environment_id);
                          return env?.slug === 'folga' && s.selected;
                        }).length} selecionados
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">
                      {t('autoFill.daysOffHelp')}
                    </p>
                    <div className="space-y-2">
                      {suggestedEntries
                        .map((suggestion, index) => ({ ...suggestion, originalIndex: index }))
                        .filter(s => {
                          const env = getEnvironment(s.environment_id);
                          return env?.slug === 'folga';
                        })
                        .map((suggestion) => {
                          const env = getEnvironment(suggestion.environment_id);
                          return (
                            <div
                              key={suggestion.originalIndex}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors border border-gray-200 dark:border-gray-800"
                            >
                              <input
                                type="checkbox"
                                checked={suggestion.selected}
                                onChange={(e) => {
                                  const newSuggestions = [...suggestedEntries];
                                  newSuggestions[suggestion.originalIndex].selected = e.target.checked;
                                  setSuggestedEntries(newSuggestions);
                                }}
                                className="w-5 h-5 rounded border-[var(--border)] text-gray-600 focus:ring-2 focus:ring-gray-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-[var(--foreground)]">
                                    {new Date(suggestion.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <div className="inline-block px-3 py-1 rounded-md text-xs bg-gray-100 text-gray-800">
                                    {env?.slug || 'folga'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Next Embarque (Suggestion only - not pre-selected) */}
                {suggestedEntries.filter(s => {
                  const env = getEnvironment(s.environment_id);
                  return env?.slug === 'embarque';
                }).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                      <h4 className="text-sm font-semibold text-[var(--foreground)]">
                        {t('autoFill.nextTransition')}
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">
                      {t('autoFill.nextTransitionHelp')}
                    </p>
                    <div className="space-y-2">
                      {suggestedEntries
                        .map((suggestion, index) => ({ ...suggestion, originalIndex: index }))
                        .filter(s => {
                          const env = getEnvironment(s.environment_id);
                          return env?.slug === 'embarque';
                        })
                        .map((suggestion) => {
                          const env = getEnvironment(suggestion.environment_id);
                          return (
                            <div
                              key={suggestion.originalIndex}
                              className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800 opacity-75"
                            >
                              <input
                                type="checkbox"
                                checked={suggestion.selected}
                                onChange={(e) => {
                                  const newSuggestions = [...suggestedEntries];
                                  newSuggestions[suggestion.originalIndex].selected = e.target.checked;
                                  setSuggestedEntries(newSuggestions);
                                }}
                                className="w-5 h-5 rounded border-[var(--border)] text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-[var(--foreground)]">
                                    {new Date(suggestion.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <div className="inline-block px-3 py-1 rounded-md text-xs bg-blue-100 text-blue-800">
                                    {env?.slug || 'embarque'}
                                  </div>
                                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-auto">
                                    ⚠️ Opcional
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-[var(--muted-foreground)] text-center pt-2 border-t border-[var(--border)]">
                {t('autoFill.selectedCount', { count: suggestedEntries.filter(s => s.selected).length, total: suggestedEntries.length })}
              </div>
            </div>

            {/* Modal Footer - Fixed at bottom */}
            <div className="p-6 border-t border-[var(--border)] flex items-center justify-end gap-3 flex-shrink-0 bg-[var(--card)]">
              <button
                onClick={() => {
                  setShowAutoFillModal(false);
                  setSuggestedEntries([]);
                }}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
              >
                {t('autoFill.cancelAll')}
              </button>
              <button
                onClick={handleConfirmAutoFill}
                disabled={loading || suggestedEntries.filter(s => s.selected).length === 0}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('saving') : t('autoFill.confirmSelected')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

