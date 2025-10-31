import React from 'react';
import {getTranslations, getLocale} from 'next-intl/server';

export default async function AlertBanner() {
  try {
    const [res, t, locale] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/notifications/alerts`, { cache: 'no-store' }),
      getTranslations('dashboard'),
      getLocale()
    ]);
    if (!res.ok) return null;
    const { alerts } = await res.json();
    if (!Array.isArray(alerts) || alerts.length === 0) return null;
    return (
      <div className="space-y-2">
        {alerts.map((a: any, i: number) => {
          const message = a.i18nKey ? t(`alerts.${a.i18nKey}`, a.params ?? {}) : a.message;
          const href = a.href ? `/${locale}${a.href.startsWith('/') ? a.href : '/' + a.href}` : undefined;
          const cta = a.actionKey ? t(`alerts.cta.${a.actionKey}`) : t('alerts.cta.open');
          return (
            <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${a.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'}`}>
              <div className="text-sm">{message}</div>
              {href && (
                <a href={href} className="ml-4 text-sm font-medium underline underline-offset-2">
                  {cta}
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  } catch {
    return null;
  }
}

