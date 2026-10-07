import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';
import { OfflineStorage } from '@/lib/offline/storage';

const baseProps = {
  timesheetId: 'ts-1',
  employeeId: 'emp-1',
  periodo_ini: '2026-10-01',
  periodo_fim: '2026-10-31',
  status: 'rascunho',
  initialEntries: [] as [],
  locale: 'pt-BR',
};

function stubFetch(statusBody: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const target = String(url);
      if (target.includes('/api/employee/face-recognition/status/')) {
        return { ok: true, status: 200, json: async () => statusBody };
      }
      if (target.includes('/api/employee/environments')) {
        return { ok: true, status: 200, json: async () => ({ environments: [] }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    })
  );
}

describe('TimesheetCalendar faixa de biometria', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubOfflineStorage() {
    vi.spyOn(OfflineStorage.prototype, 'getTimesheetOps').mockResolvedValue([]);
    vi.spyOn(OfflineStorage.prototype, 'syncTimesheetOpsState').mockResolvedValue(undefined);
    vi.spyOn(OfflineStorage.prototype, 'saveFaceDescriptor').mockResolvedValue(undefined);
    vi.spyOn(OfflineStorage.prototype, 'deleteFaceDescriptor').mockResolvedValue(undefined);
    vi.spyOn(OfflineStorage.prototype, 'getFaceDescriptor').mockResolvedValue(null);
  }

  it('sem cadastro mostra a faixa pendente e #biometric-enroll-start', async () => {
    stubOfflineStorage();
    stubFetch({ is_registered: false });
    render(<TimesheetCalendar {...baseProps} />);

    expect(await screen.findByText('enrollBannerTitle')).toBeInTheDocument();
    expect(document.getElementById('biometric-enroll-banner')).toBeInTheDocument();
    expect(document.getElementById('biometric-enroll-start')).toBeInTheDocument();
    expect(document.getElementById('biometric-enrolled-status')).not.toBeInTheDocument();
  });

  it('com cadastro mostra #biometric-enrolled-status e esconde o botão de cadastro', async () => {
    stubOfflineStorage();
    stubFetch({
      is_registered: true,
      face_data: { face_encoding: [0.1, 0.2, 0.3] },
    });
    render(<TimesheetCalendar {...baseProps} />);

    expect(await screen.findByText('enrolledStatusTitle')).toBeInTheDocument();
    expect(document.getElementById('biometric-enrolled-status')).toBeInTheDocument();
    expect(document.getElementById('biometric-enroll-start')).not.toBeInTheDocument();
    expect(document.getElementById('biometric-enroll-banner')).not.toBeInTheDocument();
  });
});
