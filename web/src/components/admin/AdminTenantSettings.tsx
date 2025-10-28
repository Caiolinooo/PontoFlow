"use client";
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface AdminTenantSettingsProps {
  locale: string;
  settings: any;
}

export default function AdminTenantSettings({ locale, settings }: AdminTenantSettingsProps) {
  const t = useTranslations('adminSettings.tenantSettings');
  const tRoot = useTranslations('adminSettings');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const data: any = {};

    // Only include non-empty fields
    formData.forEach((value, key) => {
      if (value !== '') {
        data[key] = value;
      }
    });

    try {
      const res = await fetch(`/api/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: tRoot('saveSuccess') });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: tRoot('saveError') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: tRoot('saveError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">
          {t('subtitle')}
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">{t('companyInfo.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('companyInfo.tradeName')}</label>
              <input name="company_name" defaultValue={settings?.company_name ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('companyInfo.legalName')}</label>
              <input name="company_legal_name" defaultValue={settings?.company_legal_name ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('companyInfo.document')}</label>
              <input name="company_document" defaultValue={settings?.company_document ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('companyInfo.description')}</label>
              <input name="company_description" defaultValue={settings?.company_description ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('companyInfo.website')}</label>
              <input name="website" defaultValue={settings?.website ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('companyInfo.email')}</label>
              <input name="email" defaultValue={settings?.email ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">{t('address.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('address.line1')}</label>
              <input name="address_line1" defaultValue={settings?.address_line1 ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('address.line2')}</label>
              <input name="address_line2" defaultValue={settings?.address_line2 ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('address.city')}</label>
              <input name="city" defaultValue={settings?.city ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('address.state')}</label>
              <input name="state" defaultValue={settings?.state ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('address.postalCode')}</label>
              <input name="postal_code" defaultValue={settings?.postal_code ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('address.country')}</label>
              <input name="country" defaultValue={settings?.country ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">{t('branding.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">{t('branding.logo')}</label>
              <div className="space-y-2">
                <input
                  name="logo_url"
                  defaultValue={settings?.logo_url ?? ''}
                  className="w-full rounded border p-2 bg-[var(--input)]"
                  placeholder={t('branding.logoPlaceholder')}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] file:text-[var(--primary-foreground)] hover:file:opacity-90"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const input = e.target.parentElement?.parentElement?.querySelector('input[name="logo_url"]') as HTMLInputElement;
                          if (input) input.value = reader.result as string;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <span className="text-xs text-[var(--muted-foreground)]">{t('branding.uploadHelp')}</span>
                </div>
                {settings?.logo_url && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.logo_url} alt="Logo preview" className="h-16 w-auto object-contain border rounded p-2" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('branding.watermarkText')}</label>
              <input name="watermark_text" defaultValue={settings?.watermark_text ?? ''} className="w-full rounded border p-2 bg-[var(--input)]" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('branding.watermarkImage')}</label>
              <div className="space-y-2">
                <input
                  name="watermark_url"
                  defaultValue={settings?.watermark_url ?? ''}
                  className="w-full rounded border p-2 bg-[var(--input)]"
                  placeholder={t('branding.watermarkPlaceholder')}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)] file:text-[var(--primary-foreground)] hover:file:opacity-90"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const input = e.target.parentElement?.querySelector('input[name="watermark_url"]') as HTMLInputElement;
                        if (input) input.value = reader.result as string;
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {settings?.watermark_url && (
                  <div className="mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={settings.watermark_url} alt="Watermark preview" className="h-12 w-auto object-contain border rounded p-2" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Work Mode Settings */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">Modo de Trabalho</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Regime de Trabalho</label>
              <select
                name="work_mode"
                defaultValue={settings?.work_mode ?? 'standard'}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="offshore">🚢 Offshore - Regime de embarque/desembarque com escalas rotativas (7x7, 14x14, 21x21, 28x28)</option>
                <option value="standard">🏢 Padrão - Trabalho normal com marcação diária de ponto (22 dias/mês no Brasil)</option>
                <option value="flexible">⚙️ Flexível - Regras personalizadas por tenant</option>
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Define como o sistema de timesheet funciona para este tenant.
                <br />
                <strong>Offshore:</strong> Habilita sugestões automáticas de lançamentos baseadas em escalas de trabalho.
                <br />
                <strong>Padrão:</strong> Marcação tradicional de ponto com hora de entrada, saída e almoço.
                <br />
                <strong>Flexível:</strong> Permite configurações customizadas.
              </p>
            </div>
          </div>
        </div>

        {/* Period Settings */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">{t('periodSettings.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('periodSettings.deadlineDay')}</label>
              <select
                name="deadline_day"
                defaultValue={settings?.deadline_day ?? 0}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="0">{t('periodSettings.lastDayOfMonth')}</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>{t('periodSettings.day', { day })}</option>
                ))}
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('periodSettings.deadlineHelp')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('periodSettings.autoLock')}</label>
              <select
                name="auto_lock_enabled"
                defaultValue={settings?.auto_lock_enabled !== false ? 'true' : 'false'}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="true">{t('periodSettings.enabled')}</option>
                <option value="false">{t('periodSettings.disabled')}</option>
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('periodSettings.autoLockHelp')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('periodSettings.autoApprove')}</label>
              <select
                name="auto_approve_enabled"
                defaultValue={settings?.auto_approve_enabled ? 'true' : 'false'}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="false">{t('periodSettings.disabled')}</option>
                <option value="true">{t('periodSettings.enabled')}</option>
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('periodSettings.autoApproveHelp')}
              </p>
            </div>
          </div>
        </div>

        {/* Auto-fill Settings */}
        <div className="bg-[var(--card)] rounded-lg p-6 border border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">{t('autoFillSettings.title')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('autoFillSettings.enabled')}</label>
              <select
                name="auto_fill_enabled"
                defaultValue={settings?.auto_fill_enabled !== false ? 'true' : 'false'}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="true">{t('periodSettings.enabled')}</option>
                <option value="false">{t('periodSettings.disabled')}</option>
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('autoFillSettings.enabledHelp')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('autoFillSettings.pastDays')}</label>
              <select
                name="auto_fill_past_days"
                defaultValue={settings?.auto_fill_past_days ? 'true' : 'false'}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="false">{t('periodSettings.disabled')}</option>
                <option value="true">{t('periodSettings.enabled')}</option>
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('autoFillSettings.pastDaysHelp')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('autoFillSettings.futureDays')}</label>
              <select
                name="auto_fill_future_days"
                defaultValue={settings?.auto_fill_future_days !== false ? 'true' : 'false'}
                className="w-full rounded border p-2 bg-[var(--input)]"
              >
                <option value="true">{t('periodSettings.enabled')}</option>
                <option value="false">{t('periodSettings.disabled')}</option>
              </select>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t('autoFillSettings.futureDaysHelp')}
              </p>
            </div>
          </div>
        </div>

        {/* Legal Template */}
        <div>
          <h3 className="text-md font-medium mb-3 text-[var(--foreground)]">{t('legalTemplate.title')}</h3>
          <div>
            <label className="block text-sm font-medium mb-1">{t('legalTemplate.label')}</label>
            <textarea
              name="legal_declaration_template"
              defaultValue={settings?.legal_declaration_template ?? ''}
              rows={10}
              className="w-full rounded border p-2 bg-[var(--input)] font-mono text-sm"
              placeholder={t('legalTemplate.placeholder')}
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {t('legalTemplate.help')}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}

