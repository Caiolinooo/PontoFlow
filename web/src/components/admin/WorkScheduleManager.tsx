"use client";
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

type Schedule = {
  id: string;
  employee_id: string;
  employee_name?: string;
  work_schedule: '7x7' | '14x14' | '21x21' | '28x28' | 'custom';
  days_on: number | null;
  days_off: number | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
};

type Employee = {
  id: string;
  label: string;
};

type Props = {
  initialSchedules: Schedule[];
  employees: Employee[];
  tenantSchedule: string;
  tenantId: string;
};

export default function WorkScheduleManager({ initialSchedules, employees, tenantSchedule, tenantId }: Props) {
  const t = useTranslations('admin.workSchedules');
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantSched, setTenantSched] = useState(tenantSchedule);
  const [savingTenant, setSavingTenant] = useState(false);

  const [form, setForm] = useState({
    employee_id: '',
    work_schedule: '14x14' as '7x7' | '14x14' | '21x21' | '28x28' | 'custom',
    days_on: '',
    days_off: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: '',
  });

  const handleCreate = async () => {
    if (!form.employee_id || !form.start_date) {
      setError(t('selectEmployeeError'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: any = {
        employee_id: form.employee_id,
        work_schedule: form.work_schedule,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      };

      if (form.work_schedule === 'custom') {
        if (!form.days_on || !form.days_off) {
          setError(t('customScheduleError'));
          return;
        }
        body.days_on = parseInt(form.days_on);
        body.days_off = parseInt(form.days_off);
      }

      const res = await fetch('/api/admin/work-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: 'create_failed' }));
        throw new Error(j.error || 'create_failed');
      }

      const { schedule } = await res.json();
      
      // Add employee name
      const emp = employees.find(e => e.id === schedule.employee_id);
      schedule.employee_name = emp?.label || schedule.employee_id;
      
      setSchedules([schedule, ...schedules]);
      setShowForm(false);
      setForm({
        employee_id: '',
        work_schedule: '14x14',
        days_on: '',
        days_off: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: '',
      });
    } catch (e: any) {
      setError(e.message || t('createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTenantSchedule = async () => {
    setSavingTenant(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_schedule: tenantSched }),
      });

      if (!res.ok) throw new Error('update_failed');
      alert(t('tenantScheduleUpdated'));
    } catch (e) {
      alert(t('updateTenantScheduleFailed'));
    } finally {
      setSavingTenant(false);
    }
  };

  const scheduleLabel = (s: string) => {
    if (s === 'custom') return 'Customizada';
    return s;
  };

  return (
    <div className="space-y-6">
      {/* Tenant Default Schedule */}
      <div className="border rounded-lg p-4 bg-blue-50">
        <h3 className="font-semibold mb-3">{t('tenantDefaultSchedule')}</h3>
        <div className="flex items-center gap-3">
          <select
            value={tenantSched}
            onChange={(e) => setTenantSched(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="7x7">{t('7x7')}</option>
            <option value="14x14">{t('14x14')}</option>
            <option value="21x21">{t('21x21')}</option>
            <option value="28x28">{t('28x28')}</option>
            <option value="custom">{t('customSchedule')}</option>
          </select>
          <button
            onClick={handleUpdateTenantSchedule}
            disabled={savingTenant}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {savingTenant ? t('saving') : t('save')}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {t('tenantDefaultScheduleDesc')}
        </p>
      </div>

      {/* Employee Overrides */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t('exceptionsTitle')}</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            {showForm ? t('cancel') : t('newException')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-4 p-4 border rounded bg-gray-50 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('employee')}</label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">{t('selectEmployee')}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">{t('schedule')}</label>
                <select
                  value={form.work_schedule}
                  onChange={(e) => setForm({ ...form, work_schedule: e.target.value as any })}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="7x7">7x7</option>
                  <option value="14x14">14x14</option>
                  <option value="21x21">21x21</option>
                  <option value="28x28">28x28</option>
                  <option value="custom">Customizada</option>
                </select>
              </div>

              {form.work_schedule === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('daysOn')}</label>
                    <input
                      type="number"
                      min="1"
                      value={form.days_on}
                      onChange={(e) => setForm({ ...form, days_on: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">{t('daysOff')}</label>
                    <input
                      type="number"
                      min="1"
                      value={form.days_off}
                      onChange={(e) => setForm({ ...form, days_off: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium mb-1">{t('startDate')}</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">{t('endDate')}</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">{t('notes')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={2}
                maxLength={500}
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('creating') : t('createException')}
            </button>
          </div>
        )}

        {/* List */}
        <div className="space-y-2">
          {schedules.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('noExceptions')}
            </p>
          )}

          {schedules.map((s) => (
            <div key={s.id} className="border rounded p-3 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{s.employee_name || s.employee_id}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    <span className="font-semibold">{scheduleLabel(s.work_schedule)}</span>
                    {s.work_schedule === 'custom' && s.days_on && s.days_off && (
                      <span> ({s.days_on} {t('daysOn').toLowerCase()}, {s.days_off} {t('daysOff').toLowerCase()})</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('period')}: {s.start_date} {s.end_date ? `${t('until')} ${s.end_date}` : t('noEndDate')}
                  </div>
                  {s.notes && (
                    <div className="text-xs text-gray-500 mt-1 italic">{s.notes}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

