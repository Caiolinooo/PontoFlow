"use client";

import { useState } from 'react';

export default function SwitchTenantButton({ tenantId, locale }: { tenantId?: string; locale?: string }) {
  const [loading, setLoading] = useState(false);
  if (!tenantId) return null;

  const isPt = (locale || '').toLowerCase().startsWith('pt');
  const label = isPt ? 'Trocar para o tenant do grupo' : "Switch to group's tenant";
  const labelLoading = isPt ? 'Trocando...' : 'Switching...';

  async function onClick() {
    try {
      setLoading(true);
      const resp = await fetch('/api/admin/me/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId })
      });
      if (!resp.ok) throw new Error('failed');
      if (typeof window !== 'undefined') window.location.reload();
    } catch {
      setLoading(false);
      // noop: Admin can usar o TenantSwitcher manualmente
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-60"
    >
      {loading ? labelLoading : label}
    </button>
  );
}

