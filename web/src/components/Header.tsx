'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import NotificationBadge from './notifications/NotificationBadge';
import NotificationModal from './notifications/NotificationModal';
import Avatar from './ui/Avatar';
import { useState, useEffect } from 'react';
import type { User } from '@/lib/auth/custom-auth';
import { branding } from '@/config/branding';
import SuperAdminModal from './admin/SuperAdminModal';
import { isSuperAdminSync } from '@/lib/auth/super-admin';

export default function Header({ initialUser }: { initialUser?: User | null }) {
  const tNav = useTranslations('nav');
  const tApp = useTranslations('app');
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);

  // Extract locale from pathname
  const locale = pathname?.split('/')[1] || 'pt-BR';

  // Check if user is super admin (for super admin button visibility)
  const isSuper = user ? isSuperAdminSync(user.email) : false;

  useEffect(() => {
    if (initialUser !== undefined) return; // Já temos o usuário do servidor; evita refetch e flicker
    
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
            console.log('Session check failed:', data.message || 'No user data');
          }
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Session check error:', error);
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
    <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-50 animate-slide-in-down">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 text-[var(--surface-foreground)]">
          {/* Logo - Responsive */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
            <a className="flex items-center gap-2 sm:gap-3" href={`/${locale}/dashboard`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt={branding.companyName}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-md object-contain bg-white/0 animate-pulse"
              />
              <span className="text-base sm:text-lg xl:text-xl font-semibold text-[var(--surface-foreground)] truncate hidden xs:block sm:block">{siteTitle}</span>
              <span className="text-base sm:text-lg xl:text-xl font-semibold text-[var(--surface-foreground)] block xs:hidden sm:hidden">PF</span>
            </a>

            {/* Developer Info - Compact */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-[var(--muted-foreground)] animate-smooth-fade-in">
              <span>© {new Date().getFullYear()} {tNav('developedBy')}</span>
              <a
                href="mailto:Caiovaleriogoulartcorreia@gmail.com"
                className="font-medium text-[var(--foreground)]/70 hover:text-[var(--primary)] transition-colors duration-300 hover:scale-105"
                title="Email do desenvolvedor"
              >
                Caio V.G.C.
              </a>
            </div>
          </div>

          {/* Minimal Actions: Theme, Language, User - Responsive */}
          <nav className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="animate-slide-in-right stagger-enhanced">
                <ThemeToggle />
              </div>
              <div className="animate-slide-in-right stagger-enhanced">
                <LanguageSwitcher />
              </div>
              {user && (
                <div className="animate-slide-in-right stagger-enhanced">
                  <NotificationBadge onClick={() => setShowNotifications(true)} />
                </div>
              )}
            </div>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center gap-2 sm:gap-3 animate-slide-in-left">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <Avatar
                        src={user.avatar || user.drive_photo_url}
                        alt={user.name}
                        initials={`${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`}
                        size="sm"
                      />
                      <span className="text-xs sm:text-sm text-[var(--surface-foreground)] opacity-80 truncate hidden sm:block lg:block xl:block">
                        {user.name || user.email}
                      </span>
                      <span className="text-xs sm:text-sm text-[var(--surface-foreground)] opacity-80 truncate block sm:hidden lg:hidden xl:hidden">
                        {user.first_name || user.email?.split('@')[0]}
                      </span>
                    </div>
                    {isSuper && (
                      <button
                        onClick={() => setShowSuperAdminModal(true)}
                        className="p-1.5 rounded hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110 opacity-70 hover:opacity-100"
                        title="Super Admin"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="text-xs sm:text-sm font-medium text-[var(--surface-foreground)] opacity-80 hover:opacity-100 transition-all duration-300 hover:scale-105 px-2 py-1 rounded-md hover:bg-[var(--muted)]/50"
                    >
                      <span className="hidden sm:inline">{tNav('signOut')}</span>
                      <span className="sm:hidden">Sair</span>
                    </button>
                  </div>
                ) : (
                  <a
                    href={`/${locale}/auth/signin`}
                    className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[var(--primary)] transition-all duration-300 hover:scale-105 px-3 py-1.5 rounded-md hover:bg-[var(--muted)]/50 animate-slide-in-left"
                  >
                    {tNav('signIn')}
                  </a>
                )}
              </>
            )}

            {/* Social Links - Mobile */}
            <div className="flex lg:hidden items-center gap-1 animate-smooth-fade-in">
              <a
                href="https://github.com/Caiolinooo"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110"
                title="GitHub"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/caio-goulart/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-[var(--muted)] transition-all duration-300 hover:scale-110"
                title="LinkedIn"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </nav>
        </div>
      </div>

      {/* Super Admin Modal - Only visible to super admins */}
      <SuperAdminModal
        isOpen={showSuperAdminModal}
        onClose={() => setShowSuperAdminModal(false)}
      />

      {/* Notification Modal */}
      {showNotifications && (
        <NotificationModal onClose={() => setShowNotifications(false)} />
      )}
    </header>
  );
}

