import { redirect } from 'next/navigation';

export default async function AdminNewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Redirect to employees/new as this is likely what the user wants
  redirect(`/${locale}/admin/employees/new`);
}

