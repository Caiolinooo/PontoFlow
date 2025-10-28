'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { useState, useEffect } from 'react';
import type { User } from '@/lib/auth/custom-auth';
import { branding } from '@/config/branding';

export default function Header({ initialUser }: { initialUser?: User | null }) {
  const tNav = useTranslations('nav');
  const tApp = useTranslations('app');
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);

  // Extract locale from pathname
  const locale = pathname?.split('/')[1] || 'pt-BR';

  useEffect(() => {
    if (initialUser !== undefined) return; // Já temos o usuário do servidor; evita refetch e flicker
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

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      // Hard navigation to ensure protected routes are fully left and session cleared
      window.location.href = `/${locale}/auth/signin`;
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const siteTitle = branding.siteTitle || tApp('title');

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 text-[var(--surface-foreground)]">
          {/* Logo */}
          <a className="flex items-center gap-3" href={`/${locale}/dashboard`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.logoUrl}
              alt={branding.companyName}
              className="w-8 h-8 rounded-md object-contain bg-white/0"
            />
            <span className="text-xl font-semibold text-[var(--surface-foreground)]">{siteTitle}</span>
          </a>

          {/* Minimal Actions: Theme, Language, User */}
          <nav className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
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
                      <span className="text-sm text-[var(--surface-foreground)] opacity-80">{user.name || user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-sm font-medium text-[var(--surface-foreground)] opacity-80 hover:opacity-100 transition-opacity"
                    >
                      {tNav('signOut')}
                    </button>
                  </div>
                ) : (
                  <a
                    href={`/${locale}/auth/signin`}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--primary)] transition-colors"
                  >
                    {tNav('signIn')}
                  </a>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

