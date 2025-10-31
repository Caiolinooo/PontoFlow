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
  const isDashboardRoute = pathname.includes('/dashboard');

  useEffect(() => {
    if (initialUser !== undefined) return;
    
    // Enhanced session check with better error handling
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
          // Debug logging for authentication issues
          if (process.env.NODE_ENV === 'development') {
            console.log('Bottom nav session check failed:', data.message || 'No user data');
          }
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Bottom nav session check error:', error);
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
        {/* Developer Footer - Only on Dashboard */}
        {isDashboardRoute && (
          <div className="border-b border-[var(--border)]/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                <span>© {new Date().getFullYear()} PontoFlow. Todos os direitos reservados.</span>
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline">Desenvolvido por</span>
                  <a
                    href="mailto:Caiovaleriogoulartcorreia@gmail.com"
                    className="font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    Caio Valério Goulart Correia
                  </a>
                  <div className="flex items-center gap-1.5">
                    <a href="https://github.com/Caiolinooo" target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-[var(--muted)] transition-colors" title="GitHub">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                    <a href="https://www.linkedin.com/in/caio-goulart/" target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-[var(--muted)] transition-colors" title="LinkedIn">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                    <a href="https://www.instagram.com/tal_do_goulart/" target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-[var(--muted)] transition-colors" title="Instagram">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

