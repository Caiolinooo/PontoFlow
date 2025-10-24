"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

import TenantSwitcher from '@/components/admin/TenantSwitcher';

type NavCategory = {
  label: string;
  icon: string;
  items: { href: string; label: string }[];
};

export default function AdminNav({ locale }: { locale?: string }) {
  const pathname = usePathname() || '';
  const currentLocale = locale || (pathname.split('/')[1] || 'pt-BR');
  const t = useTranslations('adminNav');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Organized categories
  const categories: NavCategory[] = [
    {
      label: t('people'),
      icon: '👥',
      items: [
        { href: `/${currentLocale}/admin/users`, label: t('users') },
        { href: `/${currentLocale}/admin/employees`, label: t('employees') },
        { href: `/${currentLocale}/admin/delegations`, label: t('delegations') },
        { href: `/${currentLocale}/admin/tenants/associations`, label: t('associations') },
      ],
    },
    {
      label: t('operations'),
      icon: '⚙️',
      items: [
        { href: `/${currentLocale}/admin/timesheets`, label: t('timesheets') },
        { href: `/${currentLocale}/admin/work-schedules`, label: t('workSchedules') },
        { href: `/${currentLocale}/admin/periods`, label: t('periods') },
      ],
    },
    {
      label: t('infrastructure'),
      icon: '🏢',
      items: [
        { href: `/${currentLocale}/admin/vessels`, label: t('vessels') },
        { href: `/${currentLocale}/admin/environments`, label: t('environments') },
        { href: `/${currentLocale}/admin/tenants`, label: t('tenants') },
      ],
    },
    {
      label: t('system'),
      icon: '🔧',
      items: [
        { href: `/${currentLocale}/admin/audit`, label: t('audit') },
        { href: `/${currentLocale}/admin/import-export`, label: t('importExport') },
        { href: `/${currentLocale}/admin/settings`, label: t('settings') },
      ],
    },
  ];

  // Find active category
  const activeCategory = categories.find((cat) =>
    cat.items.some((item) => pathname.startsWith(item.href))
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    if (!openCategory) return;

    const handleClick = () => setOpenCategory(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openCategory]);

  return (
    <>
      {/* Backdrop */}
      {openCategory && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpenCategory(null)}
        />
      )}

      <div className="border-b border-[var(--border)] bg-[var(--card)]/70 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            {categories.map((category) => {
              const isActive = activeCategory?.label === category.label;
              const isOpen = openCategory === category.label;

              return (
                <div key={category.label} className="relative z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenCategory(isOpen ? null : category.label);
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm'
                        : 'text-[var(--foreground)] opacity-80 hover:bg-[var(--muted)] hover:opacity-100'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.label}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl z-[9999] py-2">
                      {category.items.map((item) => {
                        const itemActive = pathname.startsWith(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpenCategory(null)}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              itemActive
                                ? 'bg-[var(--muted)] text-[var(--foreground)] font-medium'
                                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]'
                            }`}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
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
    </>
  );
}
