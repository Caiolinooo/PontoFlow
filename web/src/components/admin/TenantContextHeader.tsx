"use client";

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface TenantContextHeaderProps {
  className?: string;
}

export default function TenantContextHeader({ className = '' }: TenantContextHeaderProps) {
  const t = useTranslations('admin');
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/me/tenant', { cache: 'no-store' });
        if (!resp.ok) {
          setLoading(false);
          return;
        }
        const data = await resp.json();
        
        // Find the selected tenant
        const selectedTenantId = data.selected_tenant_id;
        const tenant = data.tenants?.find((t: any) => t.id === selectedTenantId);
        
        if (tenant) {
          setTenantName(tenant.name);
        }
      } catch (error) {
        console.error('Failed to load tenant context:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !tenantName) {
    return null;
  }

  return (
    <div className={`bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 flex items-center gap-2 ${className}`}>
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <div className="flex-1">
        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {t('currentTenant')}
        </p>
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
          {tenantName}
        </p>
      </div>
    </div>
  );
}

