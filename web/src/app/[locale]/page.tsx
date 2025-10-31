import {getTranslations} from 'next-intl/server';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
    </main>
  );
}

