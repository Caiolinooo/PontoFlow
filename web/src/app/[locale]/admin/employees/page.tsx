"use client";
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';
import { MetaPageHeader } from '@/components/ui/meta/PageHeader';
import { isMetaUI } from '@/lib/flags';

export default function EmployeesListPage() {
  const t = useTranslations('admin.employees');
  const tErr = useTranslations('errors');
  const tUsers = useTranslations('admin.users');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  // Modal de grupos
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalEmp, setGroupModalEmp] = useState<any | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupResults, setGroupResults] = useState<Array<{ id: string; name: string }>>([]);

  // Debounce para busca de grupos no modal
  const groupSearchDebounce = useRef<number | undefined>(undefined);

  // Locale from pathname for breadcrumbs
  const pathname = usePathname() || '';
  const locale = pathname.split('/')[1] || 'pt-BR';

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/employees', { cache: 'no-store' });
        const j = await resp.json().catch(() => ({}));
        if (resp.status === 409 && j?.error === 'tenant_required') {
          setTenantOptions(j.tenants || []);
          setTenantModalOpen(true);
          return;
        }
        if (!resp.ok) throw new Error(j?.error || tErr('generic'));
        setRows(j.employees || []);
      } catch (e: any) {
        setError(e?.message || tErr('generic'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  // Carregar grupos disponíveis quando abrir o modal
  useEffect(() => {
    if (groupModalOpen) {
      (async () => {
        try {
          const res = await fetch('/api/admin/delegations/groups', { cache: 'no-store' });
          const j = await res.json().catch(() => ({}));
          const items = (j.items || []).map((g: any) => ({ id: g.id, name: g.name }));
          setGroupResults(items);
        } catch {}
      })();
    } else {
      setGroupResults([]);
      setGroupSearch("");
    }
  }, [groupModalOpen]);


  const safe = (key: string, fallback: string) => {
    try { return t(key as any); } catch { return fallback; }
  };

  return (
    <div className="space-y-6">
      {isMetaUI() ? (
        <MetaPageHeader
          title={safe('listTitle', 'Employees')}
          subtitle={safe('listSubtitle', 'Manage employees linked to the tenant.')}
          breadcrumbs={[
            { href: `/${locale}/dashboard`, label: 'Dashboard' },
            { label: 'Admin' },
            { label: safe('listTitle', 'Employees') },
          ]}
          actions={(
            <>
              <button type="button" className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] font-medium hover:bg-[var(--muted)] transition-colors" onClick={async () => {
                try {
                  setError(null);
                  const r = await fetch('/api/admin/me/tenant', { method: 'GET', cache: 'no-store' });
                  const j = await r.json().catch(() => ({}));
                  if (!r.ok) throw new Error(j?.error || t('errors.loadTenantsFailed'));
                  setTenantOptions(j?.tenants || []);
                  setTenantModalOpen(true);
                } catch (e: any) { setError(e?.message || t('errors.loadTenantsFailed')); }
              }}>{t('selectTenant')}</button>
              <Link href="./new" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-all">{t('create')}</Link>
            </>
          )}
        />
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">{safe('listTitle', 'Employees')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{safe('listSubtitle', 'Manage employees linked to the tenant.')}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]" onClick={async () => {
              try {
                setError(null);
                const r = await fetch('/api/admin/me/tenant', { method: 'GET', cache: 'no-store' });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j?.error || t('errors.loadTenantsFailed'));
                setTenantOptions(j?.tenants || []);
                setTenantModalOpen(true);
              } catch (e: any) { setError(e?.message || t('errors.loadTenantsFailed')); }
            }}>{t('selectTenant')}</button>
            <Link href="./new" className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">{t('create')}</Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[var(--muted-foreground)]">{safe('loading', 'Loading...')}</div>
      ) : error ? (
        <div className="text-[var(--destructive)]">{error}</div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3 font-medium">{safe('id', 'ID')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('profile', 'Profile')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('groups', 'Groups')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('managers', 'Managers')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('vessel', 'Vessel')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('position', 'Position')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('costCenter', 'Cost Center')}</th>
                <th className="text-left px-6 py-3 font-medium">{safe('actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3">{r.id}</td>
                  <td className="px-6 py-3">{r.name || r.display_name || r.email || r.profile_id}</td>
                  <td className="px-6 py-3">
                    {(r.groups || []).length ? (
                      <div className="flex flex-wrap gap-2">
                        {r.groups.map((g: any) => (
                          <span key={g.id} className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-[var(--muted)]/50 border border-[var(--border)]">
                            {g.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {(r.managers || []).length ? (
                      <div className="flex flex-wrap gap-2">
                        {r.managers.map((m: any) => (
                          <span key={m.id} className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-[var(--muted)]/50 border border-[var(--border)]">
                            {m.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-3">{r.vessel_id || '-'}</td>
                  <td className="px-6 py-3">{r.cargo || '-'}</td>
                  <td className="px-6 py-3">{r.centro_custo || '-'}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-[var(--muted)] text-[var(--foreground)] text-xs font-medium hover:bg-[var(--muted)]/80 transition-colors" onClick={async () => {
                        const vesselPrompt = window.prompt(safe('vesselPrompt', 'Vessel ID (empty to clear):'), r.vessel_id || '');
                        if (vesselPrompt === null) return;
                        const cargoPrompt = window.prompt(safe('cargoPrompt', 'Position:'), r.cargo || '');
                        if (cargoPrompt === null) return;
                        const ccPrompt = window.prompt(safe('costCenterPrompt', 'Cost Center:'), r.centro_custo || '');
                        if (ccPrompt === null) return;
                        const vessel_id = vesselPrompt.trim();
                        const cargo = cargoPrompt.trim();
                        const centro_custo = ccPrompt.trim();
                        const resp = await fetch(`/api/admin/employees/${r.id}`, {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ vessel_id: vessel_id || null, cargo: cargo || null, centro_custo: centro_custo || null })
                        });
                        if (!resp.ok) { alert(safe('updateFailed', 'Failed to update')); return; }
                        setRows(rows.map(x => x.id === r.id ? { ...x, vessel_id: vessel_id || null, cargo: cargo || null, centro_custo: centro_custo || null } : x));
                      }}>{tUsers('edit')}</button>
                      <button className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors" onClick={() => { setGroupModalEmp(r); setGroupModalOpen(true); }}>{safe('manageGroups', 'Manage groups')}</button>
                      <button className="px-3 py-1.5 rounded-lg bg-[var(--destructive)] text-[var(--destructive-foreground)] text-xs font-medium hover:opacity-90 transition-all" onClick={async () => {
                        if (!confirm(safe('deleteConfirm', 'Delete employee? This action cannot be undone.'))) return;
                        const resp = await fetch(`/api/admin/employees/${r.id}`, { method: 'DELETE' });
                        if (!resp.ok) { alert(safe('deleteFailed', 'Failed to delete')); return; }
                        setRows(rows.filter(x => x.id !== r.id));
                      }}>{safe('delete', 'Delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TenantSelectorModal
        open={tenantModalOpen}
        tenants={tenantOptions}
        onClose={() => setTenantModalOpen(false)}
        onSelected={async (tenantId) => {
          const resp = await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId }) });
          if (!resp.ok) { setError(t('errors.setTenantFailed')); return; }
          setLoading(true);
          setError(null);
          const r2 = await fetch('/api/admin/employees', { cache: 'no-store' });

          const j2 = await r2.json().catch(() => ({}));
          if (!r2.ok) { setError(j2?.error || tErr('generic')); setLoading(false); return; }
          setRows(j2.employees || []);
          setLoading(false);
        }}
      />
      {groupModalOpen && groupModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{safe('groupsModal.title', 'Groups for')} {groupModalEmp.name || groupModalEmp.display_name || groupModalEmp.email || groupModalEmp.profile_id}</h3>
              <button onClick={() => { setGroupModalOpen(false); setGroupModalEmp(null); setGroupSearch(""); setGroupResults([]); }} className="text-[var(--muted-foreground)]">{safe('groupsModal.close', 'Close')}</button>
            </div>

            <div className="space-y-2">
              <input
                value={groupSearch}
                onChange={(e) => {
                  const q = e.target.value; setGroupSearch(q);
                  if (groupSearchDebounce.current) window.clearTimeout(groupSearchDebounce.current);
                  groupSearchDebounce.current = window.setTimeout(async () => {
                    if (q.trim().length === 0) {
                      const res = await fetch(`/api/admin/delegations/groups`);
                      const j = await res.json().catch(() => ({}));
                      const items = (j.items || []).map((g: any) => ({ id: g.id, name: g.name }));
                      setGroupResults(items);
                      return;
                    }
                    if (q.trim().length < 2) { return; }
                    const res = await fetch(`/api/admin/delegations/groups?q=${encodeURIComponent(q)}`);
                    const j = await res.json().catch(() => ({}));
                    const items = (j.items || []).map((g: any) => ({ id: g.id, name: g.name }));
                    setGroupResults(items);
                  }, 300);
                }}
                placeholder={safe('groupsModal.searchPlaceholder', 'Search groups...')}
                className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
              />
              <div className="max-h-40 overflow-auto rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
                <ul>
                  {groupResults.map(g => (
                    <li key={g.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm">{g.name}</span>
                      <button className="text-[var(--primary)] text-sm font-medium hover:opacity-80 transition-opacity" onClick={async () => {
                        const resp = await fetch('/api/admin/delegations/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: groupModalEmp.id, group_id: g.id }) });
                        if (!resp.ok) { alert(safe('groupsModal.addFailed', 'Failed to add to group')); return; }
                        setRows(rows.map(x => x.id === groupModalEmp.id ? { ...x, groups: Array.from(new Set([...(x.groups||[]), { id: g.id, name: g.name }])) } : x));
                        setGroupModalEmp((prev: any) => prev ? { ...prev, groups: Array.from(new Set([...(prev.groups||[]), { id: g.id, name: g.name }])) } : prev);
                      }}>{safe('groupsModal.add', 'Add')}</button>
                    </li>
                  ))}
                  {groupResults.length === 0 && <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{safe('groupsModal.noResults', 'No results')}</li>}
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">{safe('groupsModal.currentGroups', 'Current groups')}</h4>
              <ul className="divide-y divide-[var(--border)]">
                {(rows.find(x => x.id === groupModalEmp.id)?.groups || []).map((g: any) => (
                  <li key={g.id} className="flex items-center justify-between py-2">
                    <span className="text-sm">{g.name}</span>
                    <button className="text-[var(--destructive)]" onClick={async () => {
                      const resp = await fetch('/api/admin/delegations/members', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: groupModalEmp.id, group_id: g.id }) });
                      if (!resp.ok) { alert(safe('groupsModal.removeFailed', 'Failed to remove from group')); return; }
                      setRows(rows.map(x => x.id === groupModalEmp.id ? { ...x, groups: (x.groups||[]).filter((it: any) => it.id !== g.id) } : x));
                      setGroupModalEmp((prev: any) => prev ? { ...prev, groups: (prev.groups||[]).filter((it: any) => it.id !== g.id) } : prev);
                    }}>{safe('groupsModal.remove', 'Remove')}</button>
                  </li>
                ))}
                {((rows.find(x => x.id === groupModalEmp.id)?.groups || []).length === 0) && (
                  <li className="py-2 text-sm text-[var(--muted-foreground)]">{safe('groupsModal.noGroups', 'No groups.')}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

