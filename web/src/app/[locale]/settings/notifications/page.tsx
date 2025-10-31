import { getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import NotificationPreferencesPanel from '@/components/notifications/PreferencesPanel';
import { getMessages } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: t('notifications.preferences') || 'Notification Preferences',
  };
}

export default async function NotificationSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages();
  const t = await getTranslations({ locale });

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h1 className="text-2xl font-bold text-[var(--card-foreground)]">
              {t('notifications.preferences') || 'Notification Preferences'}
            </h1>
          </div>
          <div className="px-6 py-6">
            <NextIntlClientProvider messages={messages}>
              <NotificationPreferencesPanel />
            </NextIntlClientProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

