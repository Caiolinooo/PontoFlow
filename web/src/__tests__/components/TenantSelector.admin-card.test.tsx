import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TenantSelector from '@/components/employee/TenantSelector';

const oneTenant = [
  {
    tenant_id: 'tenant-1',
    tenant_name: 'ABZ',
    tenant_slug: 'abz',
    employee_id: 'emp-1',
    cargo: 'Admin',
    centro_custo: 'TI',
  },
];

function mockApis(admin: { status: number; body: unknown }, tenants = oneTenant) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (String(url).includes('/api/auth/session')) {
        return {
          ok: admin.status >= 200 && admin.status < 300,
          status: admin.status,
          json: async () => admin.body,
        };
      }
      if (String(url).includes('/api/employee/tenants')) {
        return { ok: true, status: 200, json: async () => ({ tenants }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    })
  );
}

describe('card de admin no ponto (TenantSelector)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mostra o card para ADMIN com uma organização', async () => {
    mockApis({ status: 200, body: { authenticated: true, user: { role: 'ADMIN' } } });
    render(<TenantSelector currentTenantId="tenant-1" locale="pt-BR" />);
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /ABZ/ })).toBeInTheDocument();
  });

  it('mostra o card para ADMIN_GLOBAL com uma organização', async () => {
    mockApis({ status: 200, body: { authenticated: true, user: { role: 'ADMIN_GLOBAL' } } });
    render(<TenantSelector currentTenantId="tenant-1" locale="pt-BR" />);
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
  });

  it('esconde o card de quem não é admin e tem uma organização', async () => {
    mockApis({ status: 200, body: { authenticated: true, user: { role: 'USER' } } });
    render(<TenantSelector currentTenantId="tenant-1" locale="pt-BR" />);
    await waitFor(() => {
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  it('mostra o seletor para colaborador com duas organizações', async () => {
    mockApis(
      { status: 200, body: { authenticated: true, user: { role: 'USER' } } },
      [
        ...oneTenant,
        {
          tenant_id: 'tenant-2',
          tenant_name: 'Outra',
          tenant_slug: 'outra',
          employee_id: 'emp-2',
          cargo: 'Colab',
          centro_custo: '',
        },
      ]
    );
    render(<TenantSelector currentTenantId="tenant-1" locale="pt-BR" />);
    expect(await screen.findByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Outra/ })).toBeInTheDocument();
  });
});
