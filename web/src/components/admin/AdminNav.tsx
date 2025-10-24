"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import TenantSwitcher from '@/components/admin/TenantSwitcher';

export default function AdminNav({ locale }: { locale?: string }) {
  const pathname = usePathname() || '';
  const currentLocale = locale || (pathname.split('/')[1] || 'pt-BR');
  const items = [
    { href: `/${currentLocale}/dashboard`, label: 'Dashboard' },
    { href: `/${currentLocale}/admin/users`, label: 'Usuários' },
    { href: `/${currentLocale}/admin/delegations`, label: 'Delegações' },
    { href: `/${currentLocale}/admin/employees`, label: 'Funcionários' },
    { href: `/${currentLocale}/admin/vessels`, label: 'Embarcações' },
    { href: `/${currentLocale}/admin/environments`, label: 'Ambientes' },
    { href: `/${currentLocale}/admin/tenants`, label: 'Tenants' },
    { href: `/${currentLocale}/admin/tenants/associations`, label: 'Associações' },
    { href: `/${currentLocale}/admin/periods`, label: 'Períodos' },
    { href: `/${currentLocale}/admin/timesheets`, label: 'Timesheets' },
    { href: `/${currentLocale}/admin/audit`, label: 'Auditoria' },
    { href: `/${currentLocale}/admin/import-export`, label: 'Import/Export' },
    { href: `/${currentLocale}/admin/access-control`, label: 'Acessos' },
    { href: `/${currentLocale}/admin/settings`, label: 'Configurações' },
  ];
  return (
    <div className="border-b border-[var(--border)] bg-[var(--card)]/70 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            {items.map((it) => {
              const active = pathname.startsWith(it.href);
              const base = 'hover:opacity-100';
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${base} ${active ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm' : 'text-[var(--foreground)] opacity-80 hover:bg-[var(--muted)]'}`}
                  aria-disabled={undefined}
                >
                  {it.label}
                </Link>
              );
            })}
          </div>
          <div className="ml-4">
            <TenantSwitcher />
          </div>
        </nav>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
    </div>
  );
}
