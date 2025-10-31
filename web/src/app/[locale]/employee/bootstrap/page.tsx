import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';

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
  // Use service client if available, otherwise server client
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? getServiceSupabase() : await getServerSupabase();

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
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 transition-all"
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
    redirect(`/${locale}/employee/timesheets`);
  }

  // 2) Ensure a profiles row exists and get display_name
  let display_name: string;
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!prof) {
    display_name = user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
    const { error: insertProfErr } = await supabase.from('profiles').insert({
      user_id: user.id,
      display_name,
      email: user.email,
      locale: (user as any).locale ?? 'pt-BR',
    });
    if (insertProfErr) {
      console.error('Failed to create profile:', insertProfErr);
    }
  } else {
    display_name = prof.display_name || user.name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email;
  }

  // 3) Create employee linked to this profile with name field
  const { data: inserted, error: insertErr } = await supabase
    .from('employees')
    .insert({
      tenant_id: tenantId as string,
      profile_id: user.id,
      name: display_name  // Required field
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('Failed to create employee:', insertErr);
    // Show error page instead of redirecting to avoid infinite loop
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-900 mb-2">Erro ao criar registro de colaborador</h1>
          <p className="text-red-700 mb-4">
            Não foi possível criar seu registro de colaborador. Por favor, entre em contato com o administrador do sistema.
          </p>
          <details className="text-sm text-red-600">
            <summary className="cursor-pointer font-medium">Detalhes técnicos</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">{JSON.stringify(insertErr, null, 2)}</pre>
          </details>
        </div>
      </div>
    );
  }

  if (!inserted?.id) {
    // Show error page instead of redirecting to avoid infinite loop
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-yellow-900 mb-2">Erro ao criar registro</h1>
          <p className="text-yellow-700">
            O registro foi criado mas não foi possível recuperar o ID. Por favor, tente novamente ou entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
  }

  // 4) Go to timesheets
  redirect(`/${locale}/employee/timesheets`);
}

