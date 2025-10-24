import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function EmployeeBootstrapPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tenant?: string }>;
}) {
  const { locale } = await params;
  const { tenant: tenantParam } = await searchParams;
  const user = await requireAuth(locale);

  // Resolve tenant: if user has no tenant, assign the only available one
  // or ask the user to pick if multiple exist.
  let tenantId = user.tenant_id as string | undefined;
  if (!tenantId) {
    let chosen = tenantParam as string | undefined;

    // Load tenants if none chosen yet
    if (!chosen) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .order('name', { ascending: true });

      if (!tenants || tenants.length === 0) {
        // No tenant configured in DB
        redirect(`/${locale}/dashboard`);
      }

      if (tenants.length === 1) {
        chosen = tenants[0].id as string;
      } else {
        // Render a simple chooser
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">Selecione o cliente (tenant)</h1>
              <p className="text-[var(--muted-foreground)]">Seu usuário ainda não está associado a um cliente. Escolha abaixo para continuar.</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg divide-y">
              {(tenants ?? []).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-[var(--foreground)] font-medium">{t.name}</div>
                    <div className="text-[var(--muted-foreground)] text-xs">{t.slug}</div>
                  </div>
                  <Link
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                    href={`/${locale}/employee/bootstrap?tenant=${t.id}`}
                  >
                    Usar este cliente
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      }
    }

    // Persist chosen tenant on the user and proceed
    if (chosen) {
      await supabase
        .from('users_unified')
        .update({ tenant_id: chosen })
        .eq('id', user.id);
      tenantId = chosen;
    }
  }

  // 1) If employee already exists, go straight to current month
  const { data: existingEmp } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId as string)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existingEmp?.id) {
    redirect(`/${locale}/employee/timesheets/current`);
  }

  // 2) Ensure a profiles row exists
  const { data: prof } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!prof) {
    const display_name = user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
    await supabase.from('profiles').insert({
      user_id: user.id,
      display_name,
      email: user.email,
      locale: (user as any).locale ?? 'pt-BR',
    });
  }

  // 3) Create employee linked to this profile
  const { data: inserted } = await supabase
    .from('employees')
    .insert({ tenant_id: tenantId as string, profile_id: user.id })
    .select('id')
    .single();

  if (!inserted?.id) {
    redirect(`/${locale}/employee/timesheets`);
  }

  // 4) Go to current month
  redirect(`/${locale}/employee/timesheets/current`);
}

