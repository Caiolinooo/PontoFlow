"use client";

interface AdminTenantSettingsProps {
  locale: string;
  settings: any;
}

export default function AdminTenantSettings({ locale, settings }: AdminTenantSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Configurações da Empresa</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          Informações da empresa, branding e templates de documentos
        </p>
      </div>

      <form action={`/${locale}/api/admin/settings`} method="post" className="space-y-6">
        {/* Company Info */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">Informações da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome fantasia</label>
              <input name="company_name" defaultValue={settings?.company_name ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Razão social</label>
              <input name="company_legal_name" defaultValue={settings?.company_legal_name ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CNPJ/Documento</label>
              <input name="company_document" defaultValue={settings?.company_document ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <input name="company_description" defaultValue={settings?.company_description ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site</label>
              <input name="website" defaultValue={settings?.website ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input name="email" defaultValue={settings?.email ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">Endereço</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Endereço (linha 1)</label>
              <input name="address_line1" defaultValue={settings?.address_line1 ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Endereço (linha 2)</label>
              <input name="address_line2" defaultValue={settings?.address_line2 ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cidade</label>
              <input name="city" defaultValue={settings?.city ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Estado</label>
              <input name="state" defaultValue={settings?.state ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CEP</label>
              <input name="postal_code" defaultValue={settings?.postal_code ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">País</label>
              <input name="country" defaultValue={settings?.country ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">Branding</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Logo (URL)</label>
              <input name="logo_url" defaultValue={settings?.logo_url ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Marca d'água (texto)</label>
              <input name="watermark_text" defaultValue={settings?.watermark_text ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Marca d'água (imagem - URL)</label>
              <input name="watermark_url" defaultValue={settings?.watermark_url ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
          </div>
        </div>

        {/* Legal Template */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">Template de Declaração</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Texto padrão da declaração</label>
            <textarea
              name="legal_declaration_template"
              defaultValue={settings?.legal_declaration_template ?? ''}
              rows={10}
              className="w-full rounded border p-2 bg-[var(--input)] font-mono text-sm"
              placeholder="Use variáveis como {{company_name}}, {{employee_name}}, {{manager_name}}, {{period}}, {{justification}}..."
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Sugestão: basear-se na CLT (art. 74), Portaria MTP 671/2021 e LGPD
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <button
            formAction={`/${locale}/api/admin/settings`}
            formMethod="PUT"
            className="px-6 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90"
          >
            Salvar Configurações da Empresa
          </button>
        </div>
      </form>
    </div>
  );
}

