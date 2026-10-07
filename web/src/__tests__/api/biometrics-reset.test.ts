import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE as deleteEmployeeRoute } from '@/app/api/employee/face-recognition/status/[employee_id]/route';
import { DELETE as deleteAdminRoute } from '@/app/api/admin/employees/[id]/biometrics/route';

const requireApiAuth = vi.fn();
const requireApiRole = vi.fn();
const from = vi.fn();

vi.mock('@/lib/auth/server', () => ({
  requireApiAuth: (...args: unknown[]) => requireApiAuth(...args),
  requireApiRole: (...args: unknown[]) => requireApiRole(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  getServiceSupabase: () => ({ from }),
}));

vi.mock('@/lib/supabase/service', () => ({
  getServiceSupabase: () => ({ from }),
}));

vi.mock('@/lib/audit/logger', () => ({
  logAudit: vi.fn(async () => undefined),
}));

function employeeChain(employee: { id: string; tenant_id: string } | null) {
  const result = { data: employee, error: null as null };
  const api = {
    select() { return api; },
    eq() { return api; },
    delete() { return api; },
    maybeSingle: async () => result,
    then(resolve: (value: typeof result) => void, reject?: (reason: unknown) => void) {
      try {
        resolve(result);
      } catch (err) {
        reject?.(err);
      }
    },
  };
  return api;
}

describe('reset biométrico', () => {
  beforeEach(() => {
    requireApiAuth.mockReset();
    requireApiRole.mockReset();
    from.mockReset();
  });

  it.each(['USER', 'MANAGER', 'TENANT_ADMIN'])('%s recebe 403 na rota de status', async (role) => {
    requireApiAuth.mockResolvedValue({ id: 'user-1', role, tenant_id: 'tenant-1' });
    const res = await deleteEmployeeRoute(
      new Request('http://localhost/api/employee/face-recognition/status/emp-1', { method: 'DELETE' }),
      { params: Promise.resolve({ employee_id: 'emp-1' }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'forbidden' });
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['USER', 'MANAGER', 'TENANT_ADMIN'])('%s recebe 403 na rota admin', async (role) => {
    requireApiRole.mockRejectedValue(new Error('Forbidden'));
    const res = await deleteAdminRoute(
      new Request('http://localhost/api/admin/employees/emp-1/biometrics', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'emp-1' }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('forbidden');
    expect(role).not.toBe('ADMIN');
  });

  it('USER, MANAGER e TENANT_ADMIN não apagam o template mesmo se o gate de papel deixar passar', async () => {
    for (const role of ['USER', 'MANAGER', 'TENANT_ADMIN']) {
      requireApiRole.mockResolvedValue({ id: 'user-1', role, tenant_id: 'tenant-1' });
      from.mockClear();
      const res = await deleteAdminRoute(
        new Request('http://localhost/api/admin/employees/emp-1/biometrics', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'emp-1' }) }
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toEqual({ success: false, error: 'forbidden' });
      expect(from).not.toHaveBeenCalled();
    }
  });

  it('ADMIN apaga o template do colaborador do tenant ativo', async () => {
    requireApiRole.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', tenant_id: 'tenant-1' });
    from.mockImplementation((table: string) => {
      if (table === 'employees') return employeeChain({ id: 'emp-1', tenant_id: 'tenant-1' });
      return employeeChain(null);
    });
    const res = await deleteAdminRoute(
      new Request('http://localhost/api/admin/employees/emp-1/biometrics', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'emp-1' }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.reset).toBe(true);
  });

  it('ADMIN de outro tenant recebe 403', async () => {
    requireApiRole.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', tenant_id: 'tenant-2' });
    from.mockImplementation((table: string) => {
      if (table === 'employees') return employeeChain({ id: 'emp-1', tenant_id: 'tenant-1' });
      return employeeChain(null);
    });
    const res = await deleteAdminRoute(
      new Request('http://localhost/api/admin/employees/emp-1/biometrics', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'emp-1' }) }
    );
    expect(res.status).toBe(403);
  });
});
