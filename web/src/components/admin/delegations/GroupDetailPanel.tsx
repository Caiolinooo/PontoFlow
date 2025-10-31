"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

type Manager = { id: string; name: string | null; email: string | null };
type Member = { employee_id: string; profile_id: string | null; name: string | null; email: string | null };

export default function GroupDetailPanel({
  groupId,
  locale,
  initialManagers,
  initialMembers,
  managersOptions,
  employeesOptions,
  vesselsOptions,
  initialVesselLinks
}: {
  groupId: string;
  locale: string;
  initialManagers: Manager[];
  initialMembers: Member[];
  managersOptions: Array<{ id: string; label: string }>;
  employeesOptions: Array<{ id: string; label: string }>;
  vesselsOptions: Array<{ id: string; label: string }>;
  initialVesselLinks: string[];
}) {
  const t = useTranslations('admin.delegations');
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [managerToAdd, setManagerToAdd] = useState<string>("");
  const [memberToAdd, setMemberToAdd] = useState<string>("");
  const [loadingMgr, setLoadingMgr] = useState(false);
  const [loadingMem, setLoadingMem] = useState(false);

  // Search states
  const [mgrResults, setMgrResults] = useState<Array<{ id: string; label: string; email?: string }>>([]);
  const [memResults, setMemResults] = useState<Array<{ id: string; label: string }>>([]);
  const [vesselResults, setVesselResults] = useState<Array<{ id: string; label: string }>>([]);

  // Pagination/search state
  const PAGE_SIZE = 20;
  const [mgrQuery, setMgrQuery] = useState("");
  const [mgrOffset, setMgrOffset] = useState(0);
  const [mgrHasMore, setMgrHasMore] = useState(false);
  const [memQuery, setMemQuery] = useState("");
  const [memOffset, setMemOffset] = useState(0);
  const [memHasMore, setMemHasMore] = useState(false);

  // Vessels linking
  const [linkedVessels, setLinkedVessels] = useState<string[]>(initialVesselLinks);
  const [vesselToAdd, setVesselToAdd] = useState<string>("");
  const [loadingVessel, setLoadingVessel] = useState(false);


  // Error states
  const [mgrError, setMgrError] = useState<string | null>(null);
  const [memError, setMemError] = useState<string | null>(null);
  const [vesselError, setVesselError] = useState<string | null>(null);

  // Debounce refs for searches
  const mgrSearchDebounce = useRef<number | undefined>(undefined);
  const memSearchDebounce = useRef<number | undefined>(undefined);
  const vesselSearchDebounce = useRef<number | undefined>(undefined);

  const addManager = async () => {
    if (!managerToAdd) return;
    setLoadingMgr(true);
    setMgrError(null);
    try {
      const res = await fetch('/api/admin/delegations/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerToAdd, group_id: groupId })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        setMgrError(j?.error || 'add_manager_failed');
        return;
      }
      const opt = managersOptions.find(o => o.id === managerToAdd) || mgrResults.find(o => o.id === managerToAdd);
      setManagers(prev => [...prev, { id: managerToAdd, name: opt?.label ?? null, email: (opt as any)?.email ?? null }]);
      setManagerToAdd("");
    } finally { setLoadingMgr(false); }
  };

  const removeManager = async (id: string) => {
    setLoadingMgr(true);
    setMgrError(null);
    try {
      const res = await fetch('/api/admin/delegations/assignments', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: id, group_id: groupId })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        setMgrError(j?.error || 'remove_manager_failed');
        return;
      }
      setManagers(prev => prev.filter(m => m.id !== id));
    } finally { setLoadingMgr(false); }
  };

  const addMember = async () => {
    if (!memberToAdd) return;
    setLoadingMem(true);
    setMemError(null);
    try {
      const res = await fetch('/api/admin/delegations/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: memberToAdd, group_id: groupId })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        setMemError(j?.error || 'add_member_failed');
        return;
      }
      const opt = employeesOptions.find(o => o.id === memberToAdd) || memResults.find(o => o.id === memberToAdd);
      setMembers(prev => [...prev, { employee_id: memberToAdd, profile_id: null, name: (opt as any)?.label ?? null, email: null }]);
      setMemberToAdd("");
    } finally { setLoadingMem(false); }
  };

  const removeMember = async (employee_id: string) => {
    setLoadingMem(true);
    setMemError(null);
    try {
      const res = await fetch('/api/admin/delegations/members', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, group_id: groupId })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        setMemError(j?.error || 'remove_member_failed');
        return;
      }
      setMembers(prev => prev.filter(m => m.employee_id !== employee_id));
    } finally { setLoadingMem(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-3">{t('managers')}</h3>
        {mgrError && (
          <div className="mb-2 text-sm text-[var(--destructive)]">{String(mgrError)}</div>
        )}

        <div className="space-y-2 mb-4">
          <input
            placeholder={t('searchManagers')}
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
            onChange={(e) => {
              const q = e.target.value.trim();
              setMgrQuery(q);
              if (mgrSearchDebounce.current) window.clearTimeout(mgrSearchDebounce.current);
              mgrSearchDebounce.current = window.setTimeout(async () => {
                if (!q) { setMgrResults([]); setMgrOffset(0); setMgrHasMore(false); return; }
                const res = await fetch(`/api/admin/search/managers?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&offset=0`);
                const j = await res.json().catch(() => ({}));
                const items = (j.items || []);
                setMgrResults(items);
                setMgrOffset(items.length);
                setMgrHasMore(items.length === PAGE_SIZE);
              }, 300);
            }}
          />
          <div className="max-h-40 overflow-auto rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
            <ul>
              {(mgrResults.length ? mgrResults : managersOptions).map((o: any) => (
                <li key={o.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{o.label}</span>
                  <button disabled={loadingMgr} onClick={async () => { setManagerToAdd(o.id); await addManager(); }} className="text-[var(--primary)] text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">{t('add')}</button>
                </li>
              ))}
              {((mgrResults.length ? mgrResults : managersOptions).length === 0) && (
                <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('noResults')}</li>
              )}
            </ul>
            {mgrResults.length > 0 && mgrHasMore && (
              <div className="p-2 text-center">
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/admin/search/managers?q=${encodeURIComponent(mgrQuery)}&limit=${PAGE_SIZE}&offset=${mgrOffset}`);
                    const j = await res.json().catch(() => ({}));
                    const items = (j.items || []);
                    setMgrResults(prev => [...prev, ...items]);
                    setMgrOffset(mgrOffset + items.length);
                    setMgrHasMore(items.length === PAGE_SIZE);
                  }}
                  className="text-[var(--primary)] hover:opacity-90"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </div>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {managers.map(m => (
            <li key={m.id} className="py-2 flex items-center justify-between">
              <div>
                <p className="text-[var(--foreground)] text-sm">{m.name ?? m.email ?? m.id}</p>
                {m.email && <p className="text-[var(--muted-foreground)] text-xs">{m.email}</p>}
              </div>
              <button disabled={loadingMgr} onClick={() => removeManager(m.id)} className="text-[var(--destructive)]">
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-3">{t('members')}</h3>
        {memError && (
          <div className="mb-2 text-sm text-[var(--destructive)]">{String(memError)}</div>
        )}

        <div className="space-y-2 mb-4">
          <input
            placeholder={t('searchMembers')}
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
            onChange={(e) => {
              const q = e.target.value.trim();
              setMemQuery(q);
              if (memSearchDebounce.current) window.clearTimeout(memSearchDebounce.current);
              memSearchDebounce.current = window.setTimeout(async () => {
                if (!q) { setMemResults([]); setMemOffset(0); setMemHasMore(false); return; }
                const res = await fetch(`/api/admin/search/employees?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&offset=0`);
                const j = await res.json().catch(() => ({}));
                const items = (j.items || []);
                setMemResults(items);
                setMemOffset(items.length);
                setMemHasMore(items.length === PAGE_SIZE);
              }, 300);
            }}
          />
          <div className="max-h-40 overflow-auto rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
            <ul>
              {(memResults.length ? memResults : employeesOptions).map((o: any) => (
                <li key={o.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{o.label}</span>
                  <button disabled={loadingMem} onClick={async () => { setMemberToAdd(o.id); await addMember(); }} className="text-[var(--primary)]">{t('add')}</button>
                </li>
              ))}
              {((memResults.length ? memResults : employeesOptions).length === 0) && (
                <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('noResults')}</li>
              )}
            </ul>
            {memResults.length > 0 && memHasMore && (
              <div className="p-2 text-center">
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/admin/search/employees?q=${encodeURIComponent(memQuery)}&limit=${PAGE_SIZE}&offset=${memOffset}`);
                    const j = await res.json().catch(() => ({}));
                    const items = (j.items || []);
                    setMemResults(prev => [...prev, ...items]);
                    setMemOffset(memOffset + items.length);
                    setMemHasMore(items.length === PAGE_SIZE);
                  }}
                  className="text-[var(--primary)] hover:opacity-90"
                >
                  Carregar mais
                </button>
              </div>
            )}
          </div>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {members.map(m => (
            <li key={m.employee_id} className="py-2 flex items-center justify-between">
              <div>
                <p className="text-[var(--foreground)] text-sm">{m.name ?? m.email ?? m.employee_id}</p>
                {m.email && <p className="text-[var(--muted-foreground)] text-xs">{m.email}</p>}
              </div>
              <button disabled={loadingMem} onClick={() => removeMember(m.employee_id)} className="text-[var(--destructive)]">
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[var(--card-foreground)] mb-3">Embarca\u00e7\u00f5es</h3>
        <div className="space-y-2 mb-4">
        {vesselError && (
          <div className="mb-2 text-sm text-[var(--destructive)]">{String(vesselError)}</div>
        )}

          <input
            placeholder={t('searchVessels')}
            className="w-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] rounded-lg px-3 py-2"
            onChange={(e) => {
              const q = e.target.value.trim();
              if (vesselSearchDebounce.current) window.clearTimeout(vesselSearchDebounce.current);
              vesselSearchDebounce.current = window.setTimeout(async () => {
                if (!q) { setVesselResults([]); return; }
                const res = await fetch(`/api/admin/vessels?q=${encodeURIComponent(q)}`);
                const j = await res.json().catch(() => ({}));
                const options = (j.vessels || []).map((v: any) => ({ id: v.id, label: v.name }));
                setVesselResults(options);
              }, 300);
            }}
          />
          <div className="max-h-40 overflow-auto rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
            <ul>
              {(vesselResults.length ? vesselResults : vesselsOptions).map((o: any) => (
                <li key={o.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{o.label}</span>
                  <button disabled={loadingVessel} onClick={async () => {
                    setVesselToAdd(o.id);
                    setLoadingVessel(true);
                    try {
                      setVesselError(null);
                      const res = await fetch('/api/admin/vessels/groups', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ group_id: groupId, vessel_id: o.id })
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({} as any));
                        setVesselError(j?.error || 'link_failed');
                      } else {
                        setLinkedVessels(prev => Array.from(new Set([...prev, o.id])));
                      }
                    } finally { setLoadingVessel(false); }
                  }} className="text-[var(--primary)]">{t('add')}</button>
                </li>
              ))}
              {((vesselResults.length ? vesselResults : vesselsOptions).length === 0) && (
                <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">{t('noResults')}</li>
              )}
            </ul>
          </div>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {linkedVessels.map(id => {
            const label = vesselsOptions.find(v => v.id === id)?.label || id;
            return (
              <li key={id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-[var(--foreground)] text-sm">{label}</p>
                </div>
                <button disabled={loadingVessel} onClick={async () => {
                  setLoadingVessel(true);
                  try {
                    setVesselError(null);
                    const res = await fetch('/api/admin/vessels/groups', {
                      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ group_id: groupId, vessel_id: id })
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({} as any));
                      setVesselError(j?.error || 'unlink_failed');
                      return;
                    }
                    setLinkedVessels(prev => prev.filter(v => v !== id));
                  } finally { setLoadingVessel(false); }
                }} className="text-[var(--destructive)]">
                  Remover
                </button>
              </li>
            );
          })}
          {linkedVessels.length === 0 && (
            <li className="py-2 text-sm text-[var(--muted-foreground)]">Nenhuma embarca\u00e7\u00e3o vinculada.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

