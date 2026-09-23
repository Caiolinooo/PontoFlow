import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as serverAuth from '@/lib/auth/server';

vi.mock('@/lib/auth/server', () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  }),
}));

// Import after mocks
import { GET, POST } from '@/app/api/notifications/preferences/route';

function makeRequest(body?: Record<string, unknown>) {
  return new Request('http://localhost/api/notifications/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Notifications Preferences API', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    (serverAuth.requireApiAuth as any).mockResolvedValue({ id: 'user-1' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('GET returns default preferences when none stored', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toBeDefined();
    expect(json.preferences.emailNotifications).toBeTypeOf('boolean');
  });

  it('POST upserts preferences successfully', async () => {
    const req = makeRequest({ emailNotifications: false, pushNotifications: true });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

