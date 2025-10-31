"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';

function toISO(y: number, m: number) {
  const mm = `${m}`.padStart(2, '0');
  return `${y}-${mm}-01`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function AdminPeriodsPage() {
  const t = useTranslations('admin.periods');
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const [locks, setLocks] = useState<Record<string, { locked: boolean; reason?: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  const [empQuery, setEmpQuery] = useState('');
  const [empList, setEmpList] = useState<any[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [empLocks, setEmpLocks] = useState<Record<string, { locked: boolean; reason?: string | null }>>({});
  const [empError, setEmpError] = useState<string | null>(null);

  // Environment-level overrides state
  const [envQuery, setEnvQuery] = useState('');
  const [envList, setEnvList] = useState<any[]>([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<string>('');
  const [envLocks, setEnvLocks] = useState<Record<string, { locked: boolean; reason?: string | null }>>({});
  const [envError, setEnvError] = useState<string | null>(null);

  // Group-level overrides state
  const [groupQuery, setGroupQuery] = useState('');
  const [groupList, setGroupList] = useState<any[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [groupLocks, setGroupLocks] = useState<Record<string, { locked: boolean; reason?: string | null }>>({});
  const [groupError, setGroupError] = useState<string | null>(null);

  // Build last 12 months starting current
  const months = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: toISO(d.getFullYear(), d.getMonth() + 1), label: monthLabel(d) });
    }
    return out;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/periods', { cache: 'no-store' });
        const j = await resp.json().catch(() => ({}));
        if (resp.status === 409 && j?.error === 'tenant_required') {
          setTenantOptions(j.tenants || []);
          setTenantModalOpen(true);
          return;
        }
        if (!resp.ok) throw new Error(j?.error || t('loadFailed'));
        const rec: Record<string, { locked: boolean; reason?: string | null }> = {};
        for (const row of j.locks ?? []) {
          rec[row.period_month] = { locked: !!row.locked, reason: row.reason ?? null };
        }
        setLocks(rec);
      } catch (e: any) {
        setError(e?.message || t('unexpectedError'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggle(monthKey: string, nextLocked: boolean) {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch('/api/admin/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_month: monthKey, locked: nextLocked })
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!resp.ok) throw new Error(j?.error || t('saveFailed'));
      setLocks(prev => ({ ...prev, [monthKey]: { ...(prev[monthKey] || {}), locked: nextLocked } }));
    } catch (e: any) {
      setError(e?.message || t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  async function ensureEmpList() {
    if (empList.length) return;
    try {
      setEmpLoading(true);
      setEmpError(null);
      const r = await fetch('/api/admin/employees', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadEmployeesFailed'));
      setEmpList(j.employees || []);
    } catch (e: any) {
      setEmpError(e?.message || t('loadEmployeesFailed'));
    } finally {
      setEmpLoading(false);
    }
  }

  async function loadEmpLocks(empId: string) {
    try {
      setEmpLoading(true);
      setEmpError(null);
      const r = await fetch(`/api/admin/periods/employees?employee_id=${encodeURIComponent(empId)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadEmployeeOverridesFailed'));
      const rec: Record<string, { locked: boolean; reason?: string | null }> = {};
      for (const row of j.locks ?? []) rec[row.period_month] = { locked: !!row.locked, reason: row.reason ?? null };
      setEmpLocks(rec);
    } catch (e: any) {
      setEmpError(e?.message || t('loadEmployeeOverridesError'));
    } finally {
      setEmpLoading(false);
    }
  }

  async function toggleEmp(monthKey: string, nextLocked: boolean) {
    if (!selectedEmp) return;
    try {
      setEmpLoading(true);
      setEmpError(null);
      const resp = await fetch('/api/admin/periods/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedEmp, period_month: monthKey, locked: nextLocked })
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!resp.ok) throw new Error(j?.error || t('saveFailed'));
      setEmpLocks(prev => ({ ...prev, [monthKey]: { ...(prev[monthKey] || {}), locked: nextLocked } }));
    } catch (e: any) {
      setEmpError(e?.message || t('saveEmployeeOverrideFailed'));
    } finally {
      setEmpLoading(false);
    }
  }
  // Environment helpers
  async function ensureEnvList() {
    if (envList.length) return;
    try {
      setEnvLoading(true);
      setEnvError(null);
      const r = await fetch('/api/admin/environments', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadEnvironmentsFailed'));
      setEnvList(j.environments || []);
    } catch (e: any) {
      setEnvError(e?.message || t('loadEnvironmentsFailed'));
    } finally {
      setEnvLoading(false);
    }
  }

  async function loadEnvLocks(envId: string) {
    try {
      setEnvLoading(true);
      setEnvError(null);
      const r = await fetch(`/api/admin/periods/environments?environment_id=${encodeURIComponent(envId)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadEnvironmentOverridesFailed'));
      const rec: Record<string, { locked: boolean; reason?: string | null }> = {};
      for (const row of j.locks ?? []) rec[row.period_month] = { locked: !!row.locked, reason: row.reason ?? null };
      setEnvLocks(rec);
    } catch (e: any) {
      setEnvError(e?.message || t('loadEnvironmentOverridesError'));
    } finally {
      setEnvLoading(false);
    }
  }

  async function toggleEnv(monthKey: string, nextLocked: boolean) {
    if (!selectedEnv) return;
    try {
      setEnvLoading(true);
      setEnvError(null);
      const resp = await fetch('/api/admin/periods/environments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment_id: selectedEnv, period_month: monthKey, locked: nextLocked })
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!resp.ok) throw new Error(j?.error || t('saveFailed'));
      setEnvLocks(prev => ({ ...prev, [monthKey]: { ...(prev[monthKey] || {}), locked: nextLocked } }));
    } catch (e: any) {
      setEnvError(e?.message || t('saveEnvironmentOverrideFailed'));
    } finally {
      setEnvLoading(false);
    }
  }

  // Group helpers
  async function ensureGroupList() {
    if (groupList.length) return;
    try {
      setGroupLoading(true);
      setGroupError(null);
      const r = await fetch('/api/admin/delegations/groups', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadGroupsFailed'));
      setGroupList(j.items || []);
    } catch (e: any) {
      setGroupError(e?.message || t('loadGroupsFailed'));
    } finally {
      setGroupLoading(false);
    }
  }

  async function loadGroupLocks(groupId: string) {
    try {
      setGroupLoading(true);
      setGroupError(null);
      const r = await fetch(`/api/admin/periods/groups?group_id=${encodeURIComponent(groupId)}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!r.ok) throw new Error(j?.error || t('loadGroupOverridesFailed'));
      const rec: Record<string, { locked: boolean; reason?: string | null }> = {};
      for (const row of j.locks ?? []) rec[row.period_month] = { locked: !!row.locked, reason: row.reason ?? null };
      setGroupLocks(rec);
    } catch (e: any) {
      setGroupError(e?.message || t('loadGroupOverridesError'));
    } finally {
      setGroupLoading(false);
    }
  }

  async function toggleGroup(monthKey: string, nextLocked: boolean) {
    if (!selectedGroup) return;
    try {
      setGroupLoading(true);
      setGroupError(null);
      const resp = await fetch('/api/admin/periods/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: selectedGroup, period_month: monthKey, locked: nextLocked })
      });
      const j = await resp.json().catch(() => ({}));
      if (resp.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!resp.ok) throw new Error(j?.error || t('saveFailed'));
      setGroupLocks(prev => ({ ...prev, [monthKey]: { ...(prev[monthKey] || {}), locked: nextLocked } }));
    } catch (e: any) {
      setGroupError(e?.message || t('saveGroupOverrideFailed'));
    } finally {
      setGroupLoading(false);
    }
  }

  if (loading) return <div className="text-[var(--muted-foreground)]">{t('loading')}</div>;
  if (error) return <div className="text-[var(--destructive)]">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]"
            onClick={async () => {
              try {
                setError(null);
                const r = await fetch('/api/admin/me/tenant', { method: 'GET', cache: 'no-store' });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j?.error || t('loadTenantsFailed'));
                setTenantOptions(j?.tenants || []);
                setTenantModalOpen(true);
              } catch (e: any) { setError(e?.message || t('loadTenantsFailed')); }
            }}
          >
            Selecionar tenant
          </button>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
            <tr>

              <th className="text-left px-6 py-3 font-medium">Período</th>
              <th className="text-left px-6 py-3 font-medium">Status</th>
              <th className="text-right px-6 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const st = locks[m.key];
              const locked = !!st?.locked;
              return (
                <tr key={m.key} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)]">{m.label}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${locked ? 'bg-[var(--destructive)]/15 text-[var(--destructive)]' : 'bg-[var(--primary)]/15 text-[var(--primary)]'}`}>
                      {locked ? 'Fechado' : 'Aberto'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => toggle(m.key, !locked)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">
                      {locked ? 'Abrir' : 'Fechar'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Overrides por Ambiente */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('overridesByEnvironment')}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t('overridesByEnvironmentDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={envQuery}
              onChange={e => setEnvQuery(e.target.value)}
              onFocus={() => ensureEnvList()}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]"
              placeholder={t('searchEnvironment')}
            />
          </div>
        </div>
        {envError && <div className="text-[var(--destructive)] text-sm">{envError}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Resultados</div>
            <div className="max-h-60 overflow-auto border border-[var(--border)] rounded-md divide-y divide-[var(--border)]">
              {(envList.filter((e:any) => {
                const needle = envQuery.trim().toLowerCase();
                if (!needle) return true;
                const name = (e.name || '').toLowerCase();
                const id = (e.id || '').toLowerCase();
                return name.includes(needle) || id.includes(needle);
              })).map((e:any) => (
                <div key={e.id} className="px-3 py-2 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-[var(--foreground)] font-medium">{e.name}</div>
                    <div className="text-[var(--muted-foreground)] text-xs">{e.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => { setSelectedEnv(e.id); await loadEnvLocks(e.id); }}
                    className="text-xs px-2 py-1 rounded bg-[var(--muted)]"
                  >Selecionar</button>
                </div>
              ))}
              {(!envList.length && !envLoading) && <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('noResults')}</div>}
              {envLoading && <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('loading')}</div>}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Overrides do mês</div>
            {!selectedEnv ? (
              <div className="text-sm text-[var(--muted-foreground)]">{t('selectEnvironmentPrompt')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Período</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(m => {
                    const st = envLocks[m.key];
                    const locked = !!st?.locked;
                    return (
                      <tr key={m.key} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 text-[var(--foreground)]">{m.label}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${locked ? 'bg-[var(--destructive)]/15 text-[var(--destructive)]' : 'bg-[var(--primary)]/15 text-[var(--primary)]'}`}>
                            {locked ? 'Fechado' : 'Aberto'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => toggleEnv(m.key, !locked)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">
                            {locked ? 'Abrir' : 'Fechar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Overrides por Grupo */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('overridesByGroup')}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t('overridesByGroupDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={groupQuery}
              onChange={e => setGroupQuery(e.target.value)}
              onFocus={() => ensureGroupList()}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]"
              placeholder={t('searchGroup')}
            />
          </div>
        </div>
        {groupError && <div className="text-[var(--destructive)] text-sm">{groupError}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Resultados</div>
            <div className="max-h-60 overflow-auto border border-[var(--border)] rounded-md divide-y divide-[var(--border)]">
              {(groupList.filter((g:any) => {
                const needle = groupQuery.trim().toLowerCase();
                if (!needle) return true;
                const name = (g.name || '').toLowerCase();
                const id = (g.id || '').toLowerCase();
                return name.includes(needle) || id.includes(needle);
              })).map((g:any) => (
                <div key={g.id} className="px-3 py-2 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-[var(--foreground)] font-medium">{g.name}</div>
                    <div className="text-[var(--muted-foreground)] text-xs">{g.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => { setSelectedGroup(g.id); await loadGroupLocks(g.id); }}
                    className="text-xs px-2 py-1 rounded bg-[var(--muted)]"
                  >Selecionar</button>
                </div>
              ))}
              {(!groupList.length && !groupLoading) && <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('noResults')}</div>}
              {groupLoading && <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('loading')}</div>}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Overrides do mês</div>
            {!selectedGroup ? (
              <div className="text-sm text-[var(--muted-foreground)]">{t('selectGroupPrompt')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Período</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(m => {
                    const st = groupLocks[m.key];
                    const locked = !!st?.locked;
                    return (
                      <tr key={m.key} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 text-[var(--foreground)]">{m.label}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${locked ? 'bg-[var(--destructive)]/15 text-[var(--destructive)]' : 'bg-[var(--primary)]/15 text-[var(--primary)]'}`}>
                            {locked ? 'Fechado' : 'Aberto'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => toggleGroup(m.key, !locked)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">
                            {locked ? 'Abrir' : 'Fechar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Overrides por Funcionário */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('overridesByEmployee')}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t('overridesByEmployeeDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={empQuery}
              onChange={e => setEmpQuery(e.target.value)}
              onFocus={() => ensureEmpList()}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]"
              placeholder={t('searchEmployee')}
            />
          </div>
        </div>
        {empError && <div className="text-[var(--destructive)] text-sm">{empError}</div>}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Resultados</div>
            <div className="max-h-60 overflow-auto border border-[var(--border)] rounded-md divide-y divide-[var(--border)]">
              {(empList.filter((e:any) => {
                const needle = empQuery.trim().toLowerCase();
                if (!needle) return true;
                const dn = (e.display_name || '').toLowerCase();
                const em = (e.email || '').toLowerCase();
                const id = (e.profile_id || e.id || '').toLowerCase();
                return dn.includes(needle) || em.includes(needle) || id.includes(needle);
              })).map((e:any) => (
                <div key={e.id} className="px-3 py-2 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="text-[var(--foreground)] font-medium">{e.display_name || e.email || e.profile_id || e.id}</div>
                    <div className="text-[var(--muted-foreground)] text-xs">{e.email || '-'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => { setSelectedEmp(e.id); await loadEmpLocks(e.id); }}
                    className="text-xs px-2 py-1 rounded bg-[var(--muted)]"
                  >Selecionar</button>
                </div>
              ))}
              {(!empList.length && !empLoading) && <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('noResults')}</div>}
              {empLoading && <div className="px-3 py-2 text-sm text-[var(----muted-foreground)]">{t('loading')}</div>}
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--muted-foreground)] mb-1">Overrides do mês</div>
            {!selectedEmp ? (
              <div className="text-sm text-[var(--muted-foreground)]">{t('selectEmployeePrompt')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Período</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(m => {
                    const st = empLocks[m.key];
                    const locked = !!st?.locked;
                    return (
                      <tr key={m.key} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 text-[var(--foreground)]">{m.label}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${locked ? 'bg-[var(--destructive)]/15 text-[var(--destructive)]' : 'bg-[var(--primary)]/15 text-[var(--primary)]'}`}>
                            {locked ? 'Fechado' : 'Aberto'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => toggleEmp(m.key, !locked)} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">
                            {locked ? 'Abrir' : 'Fechar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <TenantSelectorModal
        open={tenantModalOpen}
        tenants={tenantOptions}
        onClose={() => setTenantModalOpen(false)}
        onSelected={async (tenantId) => {
          await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId }) });
          window.location.reload();
        }}
      />

    </div>
  );
}

