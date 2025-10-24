"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useState, useEffect } from 'react';
import type { User } from '@/lib/auth/custom-auth';
import { branding } from '@/config/branding';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import TenantSwitcher from './admin/TenantSwitcher';

type NavCategory = {
  label: string;
  items: { href: string; label: string }[];
};

interface UnifiedBottomNavProps {
  initialUser?: User | null;
}

export default function UnifiedBottomNav({ initialUser }: UnifiedBottomNavProps) {
  const tNav = useTranslations('nav');
  const tApp = useTranslations('app');
  const tAdmin = useTranslations('adminNav');
  const pathname = usePathname() || '';
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Extract locale from pathname
  const locale = pathname?.split('/')[1] || 'pt-BR';
  const isAdminRoute = pathname.includes('/admin');

  useEffect(() => {
    if (initialUser !== undefined) return;
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, [initialUser]);

  useEffect(() => {
    if (!openCategory) return;
    const handleClick = () => setOpenCategory(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [openCategory]);

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      window.location.href = `/${locale}/auth/signin`;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const siteTitle = branding.siteTitle || tApp('title');

  // Admin categories
  const adminCategories: NavCategory[] = [
    {
      label: tAdmin('people'),
      items: [
        { href: `/${locale}/admin/users`, label: tAdmin('users') },
        { href: `/${locale}/admin/employees`, label: tAdmin('employees') },
        { href: `/${locale}/admin/delegations`, label: tAdmin('delegations') },
        { href: `/${locale}/admin/tenants/associations`, label: tAdmin('associations') },
      ],
    },
    {
      label: tAdmin('operations'),
      items: [
        { href: `/${locale}/admin/timesheets`, label: tAdmin('timesheets') },
        { href: `/${locale}/admin/work-schedules`, label: tAdmin('workSchedules') },
        { href: `/${locale}/admin/periods`, label: tAdmin('periods') },
      ],
    },
    {
      label: tAdmin('infrastructure'),
      items: [
        { href: `/${locale}/admin/vessels`, label: tAdmin('vessels') },
        { href: `/${locale}/admin/environments`, label: tAdmin('environments') },
        { href: `/${locale}/admin/tenants`, label: tAdmin('tenants') },
      ],
    },
    {
      label: tAdmin('system'),
      items: [
        { href: `/${locale}/admin/audit`, label: tAdmin('audit') },
        { href: `/${locale}/admin/import-export`, label: tAdmin('importExport') },
        { href: `/${locale}/admin/settings`, label: tAdmin('settings') },
      ],
    },
  ];

  const activeCategory = adminCategories.find((cat) =>
    cat.items.some((item) => pathname.startsWith(item.href))
  );

  return (
    <>
      {/* Backdrop for dropdowns */}
      {openCategory && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setOpenCategory(null)}
        />
      )}

      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--card)]/90 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Admin Menus (if admin route) */}
            <div className="flex items-center gap-4">
              {/* Logo */}
              <a className="flex items-center gap-2" href={`/${locale}/dashboard`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName}
                  className="w-7 h-7 rounded-md object-contain"
                />
                <span className="text-lg font-semibold text-[var(--foreground)] hidden sm:inline">{siteTitle}</span>
              </a>

              {/* Admin Navigation Menus */}
              {isAdminRoute && (
                <div className="flex items-center gap-1 ml-4">
                  {adminCategories.map((category) => {
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
                          <span className="hidden md:inline">{category.label}</span>
                          <span className="md:hidden">{category.label.charAt(0)}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown - opens upward */}
                        {isOpen && (
                          <div className="absolute bottom-full left-0 mb-2 w-56 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-2xl z-[9999] py-2">
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
              )}
            </div>

            {/* Right: Tenant Switcher (if admin) + Theme + Language + User */}
            <div className="flex items-center gap-3">
              {isAdminRoute && (
                <div className="hidden sm:block">
                  <TenantSwitcher />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>

              {!loading && (
                <>
                  {user ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {user.drive_photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.drive_photo_url}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                            <span className="text-[var(--primary)] font-medium text-sm">
                              {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm text-[var(--foreground)] opacity-80 hidden lg:inline">{user.name || user.email}</span>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="text-sm font-medium text-[var(--foreground)] opacity-80 hover:opacity-100 transition-opacity hidden sm:inline"
                      >
                        {tNav('signOut')}
                      </button>
                    </div>
                  ) : (
                    <a
                      href={`/${locale}/auth/signin`}
                      className="text-sm font-medium text-[var(--foreground)] opacity-80 hover:opacity-100 transition-opacity"
                    >
                      {tNav('signIn')}
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16" />
    </>
  );
}

