import {getTranslations} from 'next-intl/server';

export default async function Home() {
  const t = await getTranslations('app');
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
    </main>
  );
}

