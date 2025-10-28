"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

type Tenant = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  employee_id: string;
  cargo: string;
  centro_custo: string;
};

type Props = {
  currentTenantId: string;
  locale: string;
};

export default function TenantSelector({ currentTenantId, locale }: Props) {
  const t = useTranslations('admin.myTimesheet.tenantSelector');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState(currentTenantId);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadTenants() {
      try {
        const res = await fetch('/api/employee/tenants');
        if (res.ok) {
          const data = await res.json();
          setTenants(data.tenants || []);
        }
      } catch (err) {
        console.error('Error loading tenants:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTenants();
  }, []);

  // Don't show selector if user only has one tenant
  if (loading || tenants.length <= 1) {
    return null;
  }

  const handleTenantChange = async (newTenantId: string) => {
    if (newTenantId === selectedTenant) return;

    setSelectedTenant(newTenantId);

    // Store selection in cookie via API
    try {
      await fetch('/api/employee/set-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: newTenantId }),
      });

      // Also store in localStorage as backup
      localStorage.setItem('selected_tenant_id', newTenantId);

      // Reload the page to fetch data for the new tenant
      router.refresh();
    } catch (err) {
      console.error('Error setting tenant:', err);
    }
  };

  const currentTenant = tenants.find(t => t.tenant_id === selectedTenant);

  return (
    <div className="mb-6 p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <svg 
            className="w-5 h-5 text-[var(--muted-foreground)]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
            />
          </svg>
          <label className="text-sm font-medium text-[var(--foreground)]">
            {t('label')}
          </label>
        </div>
        
        <select
          value={selectedTenant}
          onChange={(e) => handleTenantChange(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--input)] text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm font-medium"
        >
          {tenants.map((tenant) => (
            <option key={tenant.tenant_id} value={tenant.tenant_id}>
              {tenant.tenant_name} {tenant.cargo && `- ${tenant.cargo}`}
            </option>
          ))}
        </select>

        {currentTenant && (
          <div className="hidden md:flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="px-2 py-1 bg-[var(--muted)] rounded">
              {currentTenant.cargo || 'N/A'}
            </span>
            {currentTenant.centro_custo && (
              <span className="px-2 py-1 bg-[var(--muted)] rounded">
                CC: {currentTenant.centro_custo}
              </span>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        {t('info', { count: tenants.length })}
      </p>
    </div>
  );
}

