"use client";

import { useEffect, useState, useRef } from "react";

type Tenant = { id: string; name: string };

export default function TenantSwitcher() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch('/api/admin/me/tenant', { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || 'Falha ao carregar tenants');
        setTenants(j?.tenants || []);
        setCurrent(j?.current_tenant_id ?? null);
      } catch (e: any) { setError(e?.message || 'Falha ao carregar tenants'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function onSelect(id: string) {
    try {
      setError(null);
      const resp = await fetch('/api/admin/me/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: id }) });
      if (!resp.ok) throw new Error('Falha ao definir tenant');
      setCurrent(id);
      if (typeof window !== 'undefined') window.location.reload();
    } catch (e: any) { setError(e?.message || 'Falha ao definir tenant'); }
  }

  const label = tenants.find(t => t.id === current)?.name || (current ? current : 'Sem tenant');

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setOpen(v => !v)} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {loading ? 'Carregando...' : `Tenant: ${label}`}
      </button>
      {open && (
        <div className="absolute right-0 -mt-2 bottom-full mb-2 w-64 border border-[var(--border)] bg-[var(--card)] rounded-lg shadow">
          <div className="p-2 text-xs text-[var(--muted-foreground)]">Selecionar tenant</div>
          <ul className="max-h-80 overflow-auto">
            {tenants.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--muted-foreground)]">Nenhum tenant</li>
            ) : tenants.map(t => (
              <li key={t.id}>
                <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)]/40 ${t.id === current ? 'font-semibold' : ''}`} onClick={() => { setOpen(false); onSelect(t.id); }}>
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
          {error && <div className="px-3 py-2 text-[var(--destructive)] text-xs">{error}</div>}
        </div>
      )}
    </div>
  );
}

