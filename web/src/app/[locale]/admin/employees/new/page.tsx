"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import TenantSelectorModal, { TenantOption } from '@/components/admin/TenantSelectorModal';

export default function NewEmployeePage() {
  const t = useTranslations('admin.employees');
  const tErr = useTranslations('errors');
  const router = useRouter();
  const [profile_id, setProfileId] = useState("");
  const [vessel_id, setVesselId] = useState("");
  const [cargo, setCargo] = useState("");
  const [centro_custo, setCentroCusto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [selectingTenant, setSelectingTenant] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userSearching, setUserSearching] = useState(false);
  const [userResults, setUserResults] = useState<Array<{id:string; name?:string|null; first_name?:string|null; last_name?:string|null; email?:string|null}>>([]);
  const [userError, setUserError] = useState<string | null>(null);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const makeReq = async () => {
        const resp = await fetch('/api/admin/employees', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id, vessel_id: vessel_id || null, cargo: cargo || null, centro_custo: centro_custo || null })
        });
        const j = await resp.json().catch(() => ({}));
        return { resp, j } as const;
      };
      let { resp, j } = await makeReq();
      if (resp.status === 409 && j?.error === 'tenant_required') {
        setTenantOptions(j.tenants || []);
        setTenantModalOpen(true);
        return;
      }
      if (!resp.ok) throw new Error(j?.error || 'Falha ao criar');
      router.push('../employees');
    } catch (e: any) {
      setError(e?.message || tErr('generic'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('newEmployeeTitle')}</h1>
        <button type="button" disabled={selectingTenant} onClick={async () => {
          try {
            setSelectingTenant(true);
            setError(null);
            const r = await fetch('/api/admin/me/tenant', { method: 'GET', cache: 'no-store' });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(j?.error || t('errors.loadTenantsFailed'));
            setTenantOptions(j?.tenants || []);
            setTenantModalOpen(true);
          } catch (e: any) { setError(e?.message || t('errors.loadTenantsFailed')); } finally { setSelectingTenant(false); }
        }} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]">{t('selectTenant')}</button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted-foreground)] mb-1">{t('profileId')}</label>
          <input value={profile_id} onChange={e => setProfileId(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" placeholder="uuid do perfil (profiles.user_id)" />
          <div className="mt-3 p-3 border border-[var(--border)] rounded-md bg-[var(--muted)]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--muted-foreground)]">{t('useUsersSource')}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={userQuery}
                onChange={e => setUserQuery(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]"
                placeholder={t('searchPlaceholder')}
              />
              <button
                type="button"
                disabled={userSearching}
                onClick={async () => {
                  try {
                    setUserSearching(true);
                    setUserError(null);
                    const r = await fetch(`/api/admin/users?q=${encodeURIComponent(userQuery)}&limit=20`, { cache: 'no-store' });
                    const j = await r.json().catch(() => ({}));
                    if (!r.ok) throw new Error(j?.error || t('errors.searchUsersFailed'));
                    setUserResults(j.users || []);
                  } catch (e: any) {
                    setUserError(e?.message || t('errors.searchUsersFailed'));
                  } finally {
                    setUserSearching(false);
                  }
                }}
                className="px-3 py-2 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)]"
              >
                {userSearching ? t('searching') : t('search')}
              </button>
            </div>
            {userError && <div className="text-[var(--destructive)] text-xs mt-2">{userError}</div>}
            {!!userResults.length && (
              <div className="mt-3 max-h-48 overflow-auto divide-y divide-[var(--border)] bg-[var(--card)] rounded-md border border-[var(--border)]">
                {userResults.map(u => (
                  <div key={u.id} className="px-3 py-2 flex items-center justify-between">
                    <div className="text-sm">
                      <div className="text-[var(--foreground)] font-medium">{u.name || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || u.id}</div>
                      <div className="text-[var(--muted-foreground)] text-xs">{u.email}</div>
                    </div>
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded bg-[var(--muted)]"
                      onClick={() => setProfileId(u.id)}
                    >{t('select')}</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">{t('vesselId')}</label>
            <input value={vessel_id} onChange={e => setVesselId(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" placeholder="uuid (opcional)" />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">{t('position')}</label>
            <input value={cargo} onChange={e => setCargo(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" placeholder="ex.: Marinheiro" />
          </div>
          <div>
            <label className="block text-sm text-[var(--muted-foreground)] mb-1">{t('costCenter')}</label>
            <input value={centro_custo} onChange={e => setCentroCusto(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)]" placeholder="codigo (opcional)" />
          </div>
        </div>
        {error && <div className="text-[var(--destructive)] text-sm">{String(error)}</div>}
        <button disabled={saving} className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60">
          {saving ? t('saving') : t('create')}
        </button>
        <TenantSelectorModal
          open={tenantModalOpen}
          tenants={tenantOptions}
          onClose={() => setTenantModalOpen(false)}
          onSelected={async (tenantId) => {
            const resp = await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: tenantId }) });
            if (!resp.ok) { setError(t('errors.setTenantFailed')); return; }
            // Após setar tenant, podemos tentar novamente a criação
            setSaving(true);
            setError(null);
            const resp2 = await fetch('/api/admin/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id, vessel_id: vessel_id || null, cargo: cargo || null, centro_custo: centro_custo || null }) });
            const j2 = await resp2.json().catch(() => ({}));
            if (!resp2.ok) { setError(j2?.error || t('errors.createFailed')); setSaving(false); return; }
            window.location.href = '../employees';
          }}
        />
      </form>
    </div>
  );
}

