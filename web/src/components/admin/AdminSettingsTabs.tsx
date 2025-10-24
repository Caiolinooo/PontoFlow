"use client";
import { useState } from 'react';
import AdminHealth from './AdminHealth';
import AdminSystemConfig from './AdminSystemConfig';
import AdminTenantSettings from './AdminTenantSettings';

type TabId = 'health' | 'system' | 'tenant';

interface AdminSettingsTabsProps {
  locale: string;
  tenant: any;
  settings: any;
}

export default function AdminSettingsTabs({ locale, tenant, settings }: AdminSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('health');

  const tabs = [
    { id: 'health' as const, label: 'Status do Sistema' },
    { id: 'system' as const, label: 'Configurações do Sistema' },
    { id: 'tenant' as const, label: 'Configurações da Empresa' },
  ];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-[var(--border)]">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'health' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Status do Sistema</h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Verifique a saúde e conectividade dos serviços
              </p>
            </div>
            <AdminHealth />
          </div>
        )}

        {activeTab === 'system' && (
          <AdminSystemConfig />
        )}

        {activeTab === 'tenant' && (
          <AdminTenantSettings locale={locale} settings={settings} />
        )}
      </div>
    </div>
  );
}

