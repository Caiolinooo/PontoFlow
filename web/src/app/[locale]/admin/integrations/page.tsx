"use client";

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const ALL_SCOPES = ['people:write', 'timesheets:read', 'sso:create'];

const ALL_EVENT_TYPES = [
  'person.created',
  'person.updated',
  'person.deactivated',
  'timesheet.submitted',
  'timesheet.approved',
  'timesheet.rejected',
  'timesheet.locked',
];

type ApiKeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type WebhookEndpointRow = {
  id: string;
  url: string;
  event_types: string[];
  enabled: boolean;
  created_at: string;
};

type WebhookEventRow = {
  id: string;
  endpoint_id: string;
  type: string;
  attempts: number;
  delivered_at: string | null;
  dead_at: string | null;
  last_error: string | null;
  created_at: string;
};

type EndpointForm = { url: string; eventTypes: string[]; enabled: boolean };

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40';
const primaryBtnClass =
  'inline-flex items-center px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:opacity-90 disabled:opacity-50';
const secondaryBtnClass =
  'inline-flex items-center px-3 py-1.5 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] rounded-lg hover:opacity-90 disabled:opacity-50';

export default function AdminIntegrationsPage() {
  const t = useTranslations('admin.integrations');

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [endpoints, setEndpoints] = useState<WebhookEndpointRow[]>([]);
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // API key creation
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>(ALL_SCOPES);
  const [keyCidrs, setKeyCidrs] = useState('');
  const [keyFormError, setKeyFormError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKeyRow | null>(null);

  // Webhook endpoint creation/edition
  const [endpointModalOpen, setEndpointModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<WebhookEndpointRow | null>(null);
  const [endpointForm, setEndpointForm] = useState<EndpointForm>({ url: '', eventTypes: ALL_EVENT_TYPES, enabled: true });
  const [endpointFormError, setEndpointFormError] = useState<string | null>(null);
  const [savingEndpoint, setSavingEndpoint] = useState(false);
  const [deletingEndpoint, setDeletingEndpoint] = useState<WebhookEndpointRow | null>(null);

  // One-time secret reveal (API key or webhook secret)
  const [revealedSecret, setRevealedSecret] = useState<{ kind: 'key' | 'webhook'; value: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [keysResp, endpointsResp, eventsResp] = await Promise.all([
        fetch('/api/admin/integrations/api-keys', { cache: 'no-store' }),
        fetch('/api/admin/integrations/webhook-endpoints', { cache: 'no-store' }),
        fetch('/api/admin/integrations/webhook-events?limit=25', { cache: 'no-store' }),
      ]);
      if (!keysResp.ok || !endpointsResp.ok || !eventsResp.ok) {
        throw new Error('load_failed');
      }
      const [keysJson, endpointsJson, eventsJson] = await Promise.all([
        keysResp.json(),
        endpointsResp.json(),
        eventsResp.json(),
      ]);
      setKeys(keysJson.keys || []);
      setEndpoints(endpointsJson.endpoints || []);
      setEvents(eventsJson.events || []);
    } catch {
      setPageError(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshEvents = async () => {
    const resp = await fetch('/api/admin/integrations/webhook-events?limit=25', { cache: 'no-store' });
    if (resp.ok) {
      const json = await resp.json();
      setEvents(json.events || []);
    }
  };

  const handleCreateKey = async () => {
    if (!keyLabel.trim()) {
      setKeyFormError(t('labelRequired'));
      return;
    }
    setSavingKey(true);
    setKeyFormError(null);
    try {
      const allowedCidrs = keyCidrs
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const resp = await fetch('/api/admin/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: keyLabel.trim(), scopes: keyScopes, allowedCidrs: allowedCidrs.length ? allowedCidrs : undefined }),
      });
      if (!resp.ok) throw new Error('create_failed');
      const json = await resp.json();
      const created = json.key;
      setKeys((prev) => [{ ...created, secret: undefined } as unknown as ApiKeyRow, ...prev]);
      setCreateKeyOpen(false);
      setKeyLabel('');
      setKeyScopes(ALL_SCOPES);
      setKeyCidrs('');
      if (created?.secret) {
        setCopied(false);
        setRevealedSecret({ kind: 'key', value: created.secret });
      }
    } catch {
      setKeyFormError(t('createKeyFailed'));
    } finally {
      setSavingKey(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!revokingKey) return;
    const resp = await fetch(`/api/admin/integrations/api-keys/${revokingKey.id}`, { method: 'DELETE' });
    if (resp.ok) {
      setKeys((prev) => prev.map((k) => (k.id === revokingKey.id ? { ...k, revoked_at: new Date().toISOString() } : k)));
    }
    setRevokingKey(null);
  };

  const openCreateEndpoint = () => {
    setEditingEndpoint(null);
    setEndpointForm({ url: '', eventTypes: ALL_EVENT_TYPES, enabled: true });
    setEndpointFormError(null);
    setEndpointModalOpen(true);
  };

  const openEditEndpoint = (endpoint: WebhookEndpointRow) => {
    setEditingEndpoint(endpoint);
    setEndpointForm({ url: endpoint.url, eventTypes: endpoint.event_types, enabled: endpoint.enabled });
    setEndpointFormError(null);
    setEndpointModalOpen(true);
  };

  const handleSaveEndpoint = async () => {
    if (!/^https:\/\//i.test(endpointForm.url.trim())) {
      setEndpointFormError(t('urlInvalid'));
      return;
    }
    if (endpointForm.eventTypes.length === 0) {
      setEndpointFormError(t('eventTypesRequired'));
      return;
    }
    setSavingEndpoint(true);
    setEndpointFormError(null);
    try {
      const payload = {
        url: endpointForm.url.trim(),
        eventTypes: endpointForm.eventTypes,
        enabled: endpointForm.enabled,
      };
      const resp = editingEndpoint
        ? await fetch(`/api/admin/integrations/webhook-endpoints/${editingEndpoint.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/integrations/webhook-endpoints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!resp.ok) throw new Error('save_failed');
      const json = await resp.json();
      const saved = json.endpoint;
      if (editingEndpoint) {
        setEndpoints((prev) => prev.map((e) => (e.id === editingEndpoint.id ? { ...e, ...saved, secret: undefined } as unknown as WebhookEndpointRow : e)));
      } else {
        setEndpoints((prev) => [{ ...saved, secret: undefined } as unknown as WebhookEndpointRow, ...prev]);
        if (saved?.secret) {
          setCopied(false);
          setRevealedSecret({ kind: 'webhook', value: saved.secret });
        }
      }
      setEndpointModalOpen(false);
    } catch {
      setEndpointFormError(t('saveEndpointFailed'));
    } finally {
      setSavingEndpoint(false);
    }
  };

  const handleToggleEndpoint = async (endpoint: WebhookEndpointRow) => {
    const resp = await fetch(`/api/admin/integrations/webhook-endpoints/${endpoint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !endpoint.enabled }),
    });
    if (resp.ok) {
      setEndpoints((prev) => prev.map((e) => (e.id === endpoint.id ? { ...e, enabled: !endpoint.enabled } : e)));
    }
  };

  const handleDeleteEndpoint = async () => {
    if (!deletingEndpoint) return;
    const resp = await fetch(`/api/admin/integrations/webhook-endpoints/${deletingEndpoint.id}`, { method: 'DELETE' });
    if (resp.ok) {
      setEndpoints((prev) => prev.filter((e) => e.id !== deletingEndpoint.id));
    }
    setDeletingEndpoint(null);
  };

  const copySecret = async () => {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret.value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const fmtDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : '—');

  if (loading) {
    return <div className="text-[var(--muted-foreground)]">{t('loading')}</div>;
  }

  if (pageError) {
    return <div className="text-[var(--destructive)]">{pageError}</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t('title')}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t('subtitle')}</p>
      </div>

      {/* API Keys */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('keysTitle')}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t('keysSubtitle')}</p>
          </div>
          <button className={primaryBtnClass} onClick={() => setCreateKeyOpen(true)}>
            {t('createKey')}
          </button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3 font-medium">{t('keyLabel')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('keyPrefix')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('scopes')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('lastUsedAt')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('status')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)]">{key.label}</td>
                  <td className="px-6 py-3 text-[var(--foreground)] font-mono text-xs">{key.key_prefix}…</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(key.scopes || []).map((scope) => (
                        <span key={scope} className="px-2 py-0.5 rounded-full bg-[var(--muted)]/60 text-[var(--muted-foreground)] text-xs font-mono">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{key.last_used_at ? fmtDate(key.last_used_at) : t('never')}</td>
                  <td className="px-6 py-3">
                    {key.revoked_at ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] text-xs">{t('revoked')}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs">{t('active')}</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {!key.revoked_at && (
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 transition-opacity"
                        onClick={() => setRevokingKey(key)}
                      >
                        {t('revoke')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-[var(--muted-foreground)]">{t('noKeys')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Webhook Endpoints */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('endpointsTitle')}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t('endpointsSubtitle')}</p>
          </div>
          <button className={primaryBtnClass} onClick={openCreateEndpoint}>
            {t('createEndpoint')}
          </button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3 font-medium">{t('url')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('eventTypes')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('status')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('createdAt')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((endpoint) => (
                <tr key={endpoint.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)] font-mono text-xs break-all max-w-xs">{endpoint.url}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1 max-w-sm">
                      {(endpoint.event_types || []).map((type) => (
                        <span key={type} className="px-2 py-0.5 rounded-full bg-[var(--muted)]/60 text-[var(--muted-foreground)] text-xs font-mono">
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      className={`px-2 py-0.5 rounded-full text-xs ${endpoint.enabled ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-[var(--muted)]/60 text-[var(--muted-foreground)]'}`}
                      onClick={() => handleToggleEndpoint(endpoint)}
                      title={t('toggleEnabled')}
                    >
                      {endpoint.enabled ? t('enabled') : t('disabled')}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{fmtDate(endpoint.created_at)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors"
                        onClick={() => openEditEndpoint(endpoint)}
                      >
                        {t('edit')}
                      </button>
                      <button
                        className="px-2 py-1 rounded-md bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90 transition-opacity"
                        onClick={() => setDeletingEndpoint(endpoint)}
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {endpoints.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-[var(--muted-foreground)]">{t('noEndpoints')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Webhook Events */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('eventsTitle')}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t('eventsSubtitle')}</p>
          </div>
          <button className={secondaryBtnClass} onClick={refreshEvents}>
            {t('refresh')}
          </button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)]/40 text-[var(--muted-foreground)]">
              <tr>
                <th className="text-left px-6 py-3 font-medium">{t('eventType')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('attempts')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('status')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('lastError')}</th>
                <th className="text-left px-6 py-3 font-medium">{t('createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-[var(--border)]">
                  <td className="px-6 py-3 text-[var(--foreground)] font-mono text-xs">{event.type}</td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{event.attempts}</td>
                  <td className="px-6 py-3">
                    {event.delivered_at ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs">{t('delivered')}</span>
                    ) : event.dead_at ? (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] text-xs">{t('dead')}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">{t('pending')}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-[var(--muted-foreground)] text-xs max-w-xs truncate" title={event.last_error || undefined}>
                    {event.last_error || '—'}
                  </td>
                  <td className="px-6 py-3 text-[var(--foreground)]">{fmtDate(event.created_at)}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-[var(--muted-foreground)]">{t('noEvents')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create API Key modal */}
      <Modal open={createKeyOpen} onClose={() => setCreateKeyOpen(false)} title={t('createKey')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('keyLabel')}</label>
            <input
              className={inputClass}
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              placeholder={t('keyLabelPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('scopes')}</label>
            <div className="space-y-1">
              {ALL_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(scope)}
                    onChange={(e) =>
                      setKeyScopes((prev) => (e.target.checked ? [...prev, scope] : prev.filter((s) => s !== scope)))
                    }
                  />
                  <span className="font-mono text-xs">{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('allowedCidrs')}</label>
            <textarea
              className={inputClass}
              rows={2}
              value={keyCidrs}
              onChange={(e) => setKeyCidrs(e.target.value)}
              placeholder={t('allowedCidrsPlaceholder')}
            />
          </div>
          {keyFormError && <p className="text-sm text-[var(--destructive)]">{keyFormError}</p>}
          <div className="flex justify-end gap-2">
            <button className={secondaryBtnClass} onClick={() => setCreateKeyOpen(false)}>
              {t('cancel')}
            </button>
            <button className={primaryBtnClass} onClick={handleCreateKey} disabled={savingKey}>
              {savingKey ? t('saving') : t('create')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit webhook endpoint modal */}
      <Modal open={endpointModalOpen} onClose={() => setEndpointModalOpen(false)} title={editingEndpoint ? t('editEndpoint') : t('createEndpoint')}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('url')}</label>
            <input
              className={inputClass}
              value={endpointForm.url}
              onChange={(e) => setEndpointForm((prev) => ({ ...prev, url: e.target.value }))}
              placeholder={t('urlPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">{t('eventTypes')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {ALL_EVENT_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={endpointForm.eventTypes.includes(type)}
                    onChange={(e) =>
                      setEndpointForm((prev) => ({
                        ...prev,
                        eventTypes: e.target.checked ? [...prev.eventTypes, type] : prev.eventTypes.filter((x) => x !== type),
                      }))
                    }
                  />
                  <span className="font-mono text-xs">{type}</span>
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={endpointForm.enabled}
              onChange={(e) => setEndpointForm((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
            {t('enabled')}
          </label>
          {endpointFormError && <p className="text-sm text-[var(--destructive)]">{endpointFormError}</p>}
          <div className="flex justify-end gap-2">
            <button className={secondaryBtnClass} onClick={() => setEndpointModalOpen(false)}>
              {t('cancel')}
            </button>
            <button className={primaryBtnClass} onClick={handleSaveEndpoint} disabled={savingEndpoint}>
              {savingEndpoint ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      </Modal>

      {/* One-time secret reveal modal */}
      <Modal open={!!revealedSecret} onClose={() => setRevealedSecret(null)} title={revealedSecret?.kind === 'key' ? t('keySecretTitle') : t('webhookSecretTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {revealedSecret?.kind === 'key' ? t('keySecretMessage') : t('webhookSecretMessage')}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--muted)]/60 text-[var(--foreground)] text-xs font-mono break-all">
              {revealedSecret?.value}
            </code>
            <button className={secondaryBtnClass} onClick={copySecret}>
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('secretWarning')}</p>
          <div className="flex justify-end">
            <button className={primaryBtnClass} onClick={() => setRevealedSecret(null)}>
              {t('close')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke key confirmation */}
      <ConfirmDialog
        isOpen={!!revokingKey}
        title={t('revokeConfirmTitle')}
        message={t('revokeConfirmMessage', { label: revokingKey?.label ?? '' })}
        confirmText={t('revoke')}
        cancelText={t('cancel')}
        isDangerous
        onConfirm={handleRevokeKey}
        onCancel={() => setRevokingKey(null)}
      />

      {/* Delete endpoint confirmation */}
      <ConfirmDialog
        isOpen={!!deletingEndpoint}
        title={t('deleteEndpointConfirmTitle')}
        message={t('deleteEndpointConfirmMessage', { url: deletingEndpoint?.url ?? '' })}
        confirmText={t('delete')}
        cancelText={t('cancel')}
        isDangerous
        onConfirm={handleDeleteEndpoint}
        onCancel={() => setDeletingEndpoint(null)}
      />
    </div>
  );
}
