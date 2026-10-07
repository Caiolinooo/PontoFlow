import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmployeesListPage from '@/app/[locale]/admin/employees/page';

const employee = {
  id: 'emp-1',
  name: 'Ana',
  biometric_registered: true,
  groups: [],
  managers: [],
};

function mockFetch(role: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const target = String(url);
      if (target.includes('/api/auth/session')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ authenticated: true, user: { role } }),
        };
      }
      if (target.includes('/api/admin/employees')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ employees: [employee] }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    })
  );
}

describe('botão resetar biometria na lista de funcionários', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ADMIN vê o botão', async () => {
    mockFetch('ADMIN');
    render(<EmployeesListPage />);
    expect(await screen.findByRole('button', { name: 'reset' })).toBeInTheDocument();
  });

  it.each(['TENANT_ADMIN', 'MANAGER', 'USER'])('%s não vê o botão', async (role) => {
    mockFetch(role);
    render(<EmployeesListPage />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'reset' })).not.toBeInTheDocument();
  });
});
