import { createHmac } from 'node:crypto';

export type SyncAction = 'upsert' | 'disable';

export async function sendUserSyncEvent(action: SyncAction, user: Record<string, any>) {
  const url = process.env.EMPLOYEEHUB_SYNC_URL; // e.g. https://employeehub.example.com/api/admin/sync/user
  const secret = process.env.ADMIN_SYNC_SECRET; // reuse same shared secret
  if (!url || !secret) return { ok: false, reason: 'missing_config' } as const;

  const payload = { action, user };
  const raw = JSON.stringify(payload);
  const sig = createHmac('sha256', secret).update(raw).digest('hex');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sync-signature': `sha256=${sig}`
    },
    body: raw,
    // Avoid caching
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: text } as const;
  }
  return { ok: true } as const;
}

