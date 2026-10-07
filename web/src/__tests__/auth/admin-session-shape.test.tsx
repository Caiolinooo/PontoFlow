import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import DashboardPage from '@/app/[locale]/dashboard/page';
import { getUserFromToken } from '@/lib/auth/custom-auth';
import { generateToken, verifyToken } from '@/lib/auth/jwt';
import { isApplicationAdmin } from '@/lib/auth/roles';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

const h = vi.hoisted(() => {
  const AUTH_ID = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc';
  const UNIFIED_ID = '75abe69b-15ac-4ac2-b973-1075c37252c5';
  const EMAIL = 'caio.correia@groupabz.com';
  const state = {
    mode: 'split-admin' as 'split-admin' | 'tenant-only',
    token: '',
    lookups: [] as string[],
  };

  function rows(table: string, filters: Array<{ op: string; col: string; val: string }>) {
    if (table === 'users_unified') {
      const byId = filters.find((f) => f.op === 'eq' && f.col === 'id');
      if (byId) {
        state.lookups.push(`users_unified.id:${byId.val}`);
        return null;
      }
      const byEmail = filters.find((f) => f.op === 'ilike' && f.col === 'email');
      if (byEmail) {
        state.lookups.push(`users_unified.email:${byEmail.val}`);
        if (state.mode === 'split-admin') return { id: UNIFIED_ID, role: 'ADMIN', email: EMAIL };
      }
      return null;
    }
    if (table === 'tenant_user_roles') {
      return [
        { user_id: AUTH_ID, tenant_id: '1c89cfe8-b7c3-4c67-9a9f-d204f0d62280', role: 'TENANT_ADMIN' },
        { user_id: AUTH_ID, tenant_id: '2376edb6-bcda-47f6-a0c7-cecd701298ca', role: 'TENANT_ADMIN' },
      ];
    }
    return null;
  }

  function builder(table: string) {
    const filters: Array<{ op: string; col: string; val: string }> = [];
    const api = {
      select() { return api; },
      eq(col: string, val: string) { filters.push({ op: 'eq', col, val }); return api; },
      ilike(col: string, val: string) { filters.push({ op: 'ilike', col, val }); return api; },
      limit() { return api; },
      async maybeSingle() {
        const data = rows(table, filters);
        const one = Array.isArray(data) ? (data[0] ?? null) : data;
        return { data: one, error: null };
      },
      then(
        onFulfilled: (value: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        const data = rows(table, filters);
        const list = Array.isArray(data) ? data : [];
        return Promise.resolve({ data: list, error: null }).then(onFulfilled, onRejected);
      },
    };
    return api;
  }

  const client = {
    from(table: string) {
      return builder(table);
    },
    auth: {
      admin: {
        async getUserById(id: string) {
          if (id !== AUTH_ID) {
            return { data: { user: null }, error: { message: 'not found' } };
          }
          return {
            data: {
              user: {
                id: AUTH_ID,
                email: EMAIL,
                user_metadata: state.mode === 'split-admin' ? { role: 'ADMIN' } : {},
                app_metadata: {},
              },
            },
            error: null,
          };
        },
        async updateUserById() {
          return { data: { user: {} }, error: null };
        },
      },
    },
  };

  return { AUTH_ID, UNIFIED_ID, EMAIL, state, client };
});

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => h.client,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (
      name === 'timesheet_session' && h.state.token ? { value: h.state.token } : undefined
    ),
  }),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  getLocale: async () => 'pt-BR',
}));

vi.mock('@/components/AlertBanner', () => ({ default: () => null }));
vi.mock('@/components/dashboard/DashboardMetrics', () => ({ default: () => null }));
vi.mock('@/components/employee/EmployeePendingStatus', () => ({ default: () => null }));

describe('sessão admin com ids diferentes', () => {
  it('cookie TENANT_ADMIN, metadata e users_unified ADMIN: card no dashboard', async () => {
    expect(h.AUTH_ID).not.toBe(h.UNIFIED_ID);
    h.state.mode = 'split-admin';
    h.state.lookups = [];

    const token = await generateToken(h.AUTH_ID, {
      role: 'TENANT_ADMIN',
      email: h.EMAIL,
      tenant_id: '1c89cfe8-b7c3-4c67-9a9f-d204f0d62280',
      name: 'Caio',
    });
    const claims = await verifyToken(token);
    expect(claims?.role).toBe('TENANT_ADMIN');
    expect(claims?.sub).toBe(h.AUTH_ID);

    const user = await getUserFromToken(token);
    expect(h.state.lookups).toContain(`users_unified.id:${h.AUTH_ID}`);
    expect(h.state.lookups).toContain(`users_unified.email:${h.EMAIL}`);
    expect(user?.id).toBe(h.AUTH_ID);
    expect(user?.id).not.toBe(h.UNIFIED_ID);
    expect(user?.role).toBe('ADMIN');
    expect(isApplicationAdmin(user?.role)).toBe(true);

    h.state.token = token;
    const page = await DashboardPage({ params: Promise.resolve({ locale: 'pt-BR' }) });
    render(page);
    expect(document.getElementById('dashboard-admin-card')).not.toBeNull();
  });

  it('sem ADMIN no cadastro, TENANT_ADMIN do tenant não abre o card', async () => {
    h.state.mode = 'tenant-only';
    h.state.lookups = [];
    const token = await generateToken(h.AUTH_ID, {
      role: 'TENANT_ADMIN',
      email: h.EMAIL,
      tenant_id: '1c89cfe8-b7c3-4c67-9a9f-d204f0d62280',
    });
    const user = await getUserFromToken(token);
    expect(user?.role).toBe('TENANT_ADMIN');
    expect(isApplicationAdmin(user?.role)).toBe(false);

    h.state.token = token;
    const page = await DashboardPage({ params: Promise.resolve({ locale: 'pt-BR' }) });
    render(page);
    expect(document.getElementById('dashboard-admin-card')).toBeNull();
  });
});
