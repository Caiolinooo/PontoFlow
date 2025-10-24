import { requireRole } from '@/lib/auth/server';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function AdminSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  await requireRole(locale, ['ADMIN']);

  const supabase = await getServerSupabase();
  // Fetch current settings server-side
  const { data } = await supabase
    .from('tenant_settings')
    .select('*')
    .maybeSingle();

  const settings = data;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      {/* Health Check */}
      {/** Client component that calls /api/admin/health */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div>
        {/* Lazy import client component to avoid RSC issues */}
        {await (async () => {
          const dynamic = await import('@/components/admin/AdminHealth');
          const Comp = (dynamic as any).default;
          return <Comp />;
        })()}
      </div>

      {/* DB Config */}
      {await (async () => {
        const dynamic = await import('@/components/admin/AdminDbConfig');
        const Comp = (dynamic as any).default;
        return <Comp />;
      })()}

      <form action={`/${locale}/api/admin/settings`} method="post" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Nome fantasia</label>
            <input name="company_name" defaultValue={settings?.company_name ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Razão social</label>
            <input name="company_legal_name" defaultValue={settings?.company_legal_name ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">CNPJ/Documento</label>
            <input name="company_document" defaultValue={settings?.company_document ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Descrição</label>
            <input name="company_description" defaultValue={settings?.company_description ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Site</label>
            <input name="website" defaultValue={settings?.website ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">E-mail</label>
            <input name="email" defaultValue={settings?.email ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Endereço (linha 1)</label>
            <input name="address_line1" defaultValue={settings?.address_line1 ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Endereço (linha 2)</label>
            <input name="address_line2" defaultValue={settings?.address_line2 ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Cidade</label>
            <input name="city" defaultValue={settings?.city ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Estado</label>
            <input name="state" defaultValue={settings?.state ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">CEP</label>
            <input name="postal_code" defaultValue={settings?.postal_code ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">País</label>
            <input name="country" defaultValue={settings?.country ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Logo (URL)</label>
            <input name="logo_url" defaultValue={settings?.logo_url ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div>
            <label className="block text-sm font-medium">Marca d'água (texto)</label>
            <input name="watermark_text" defaultValue={settings?.watermark_text ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Marca d'água (imagem - URL)</label>
            <input name="watermark_url" defaultValue={settings?.watermark_url ?? ''} className="mt-1 w-full rounded border p-2 bg-[var(--input)]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Texto padrão da declaração (template)</label>
          <textarea name="legal_declaration_template" defaultValue={settings?.legal_declaration_template ?? ''} rows={10} className="mt-1 w-full rounded border p-2 bg-[var(--input)] font-mono text-sm" placeholder="Use variáveis como {{company_name}}, {{employee_name}}, {{manager_name}}, {{period}}, {{justification}}..."/>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Sugestão: basear-se na CLT (art. 74), Portaria MTP 671/2021 e LGPD; este texto é aplicado na emissão da declaração.</p>
        </div>

        <button formAction={`/${locale}/api/admin/settings`} formMethod="PUT" className="px-4 py-2 rounded bg-[var(--primary)] text-[var(--primary-foreground)]">Salvar configurações</button>
      </form>
    </div>
  );
}

