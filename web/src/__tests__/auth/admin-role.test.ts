import { describe, it, expect } from 'vitest';
import { pickActiveEmployee } from '@/lib/employee/active-tenant';
import { isApplicationAdmin, resolveAppRole } from '@/lib/auth/roles';
import { resolveSsoAppRole } from '@/lib/integration/v1/sso';

function fakeSupabase(rows: {
  unified?: string | null;
  tenantRoles?: string[];
  meta?: string | null;
}) {
  return {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          if (table === 'users_unified') {
            return { data: rows.unified ? { role: rows.unified } : null };
          }
          return { data: null };
        },
        then(resolve: (value: { data: Array<{ role: string }> }) => void) {
          const data = (rows.tenantRoles ?? []).map((role) => ({ role }));
          resolve({ data });
        },
      };
    },
    auth: {
      admin: {
        async getUserById() {
          return {
            data: {
              user: rows.meta ? { user_metadata: { role: rows.meta } } : { user_metadata: {} },
            },
          };
        },
      },
    },
  };
}

describe('papel de admin na sessão', () => {
  it('ADMIN_GLOBAL vira ADMIN e COLAB continua USER', () => {
    expect(resolveAppRole('ADMIN_GLOBAL')).toBe('ADMIN');
    expect(resolveAppRole('COLAB')).toBe('USER');
    expect(resolveAppRole('USER', 'COLAB')).toBe('USER');
    expect(isApplicationAdmin('ADMIN')).toBe(true);
    expect(isApplicationAdmin('ADMIN_GLOBAL')).toBe(true);
    expect(isApplicationAdmin('USER')).toBe(false);
    expect(isApplicationAdmin('TENANT_ADMIN')).toBe(false);
    expect(isApplicationAdmin('COLAB')).toBe(false);
  });

  it('SSO de admin global não carimba USER', async () => {
    const role = await resolveSsoAppRole(
      fakeSupabase({ unified: 'USER', tenantRoles: ['ADMIN_GLOBAL'] }) as never,
      'user-1'
    );
    expect(role).toBe('ADMIN');
  });

  it('papel ADMIN do cadastro ganha de TENANT_ADMIN no JWT', () => {
    expect(resolveAppRole('TENANT_ADMIN', 'ADMIN')).toBe('ADMIN');
    expect(resolveAppRole('admin', 'TENANT_ADMIN')).toBe('ADMIN');
    expect(resolveAppRole('Admin Global')).toBe('ADMIN');
    expect(isApplicationAdmin('admin')).toBe(true);
    expect(isApplicationAdmin('TENANT_ADMIN')).toBe(false);
  });

  it('sem cookie, ponto diário ganha do offshore', () => {
    const chosen = pickActiveEmployee(
      [
        { id: 'e-off', tenant_id: 'omega', work_mode: 'offshore' },
        { id: 'e-std', tenant_id: 'abz', work_mode: 'standard' },
      ],
      null
    );
    expect(chosen?.tenant_id).toBe('abz');
  });

  it('cookie de tenant escolhido ganha do padrão', () => {
    const chosen = pickActiveEmployee(
      [
        { id: 'e-off', tenant_id: 'omega', work_mode: 'offshore' },
        { id: 'e-std', tenant_id: 'abz', work_mode: 'standard' },
      ],
      'omega'
    );
    expect(chosen?.tenant_id).toBe('omega');
  });

  it('SSO de colaborador continua USER', async () => {
    const role = await resolveSsoAppRole(
      fakeSupabase({ unified: 'USER', tenantRoles: ['COLAB'] }) as never,
      'user-2'
    );
    expect(role).toBe('USER');
  });
});
