import { describe, it, expect } from 'vitest';
import {
  generateSummaryReport,
  generateDetailedReport,
  reportToCSV,
  ReportFilters,
} from '@/lib/reports/generator';

describe('Report Generator', () => {
  const mockTimesheets = [
    {
      id: 'ts1',
      employee_id: 'emp1',
      periodo_ini: '2025-01-01',
      periodo_fim: '2025-01-31',
      status: 'aprovado',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-20T15:00:00Z',
      employee: { id: 'emp1', display_name: 'John Doe' },
      entries: [
        { id: 'e1', data: '2025-01-15', tipo: 'embarque', hora_ini: '08:00', hora_fim: '17:00', observacao: 'Normal' },
        { id: 'e2', data: '2025-01-16', tipo: 'desembarque', hora_ini: '08:00', hora_fim: '12:00', observacao: '' },
      ],
      annotations: [],
      approvals: [{ id: 'a1', status: 'aprovado', created_at: '2025-01-20T15:00:00Z', mensagem: '' }],
    },
    {
      id: 'ts2',
      employee_id: 'emp2',
      periodo_ini: '2025-01-01',
      periodo_fim: '2025-01-31',
      status: 'recusado',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-18T14:00:00Z',
      employee: { id: 'emp2', display_name: 'Jane Smith' },
      entries: [{ id: 'e3', data: '2025-01-15', tipo: 'embarque', hora_ini: '08:00', hora_fim: '17:00', observacao: '' }],
      annotations: [{ id: 'ann1', entry_id: 'e3', field_path: 'hora_ini', message: 'Invalid time' }],
      approvals: [{ id: 'a2', status: 'recusado', created_at: '2025-01-18T14:00:00Z', mensagem: 'Invalid hours' }],
    },
  ];

  describe('generateSummaryReport', () => {
    it('should generate summary report with correct counts', () => {
      const filters: ReportFilters = {};
      const report = generateSummaryReport(mockTimesheets, filters);

      expect(report.title).toBe('Timesheet Summary Report');
      expect(report.summary.totalTimesheets).toBe(2);
      expect(report.summary.approved).toBe(1);
      expect(report.summary.rejected).toBe(1);
      expect(report.summary.pending).toBe(0);
      expect(report.items.length).toBe(2);
    });

    it('should include filters in report', () => {
      const filters: ReportFilters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'aprovado',
      };
      const report = generateSummaryReport(mockTimesheets, filters);

      expect(report.filters).toEqual(filters);
    });

    it('should map timesheet data correctly', () => {
      const report = generateSummaryReport(mockTimesheets, {});
      const item = report.items[0];

      expect(item.id).toBe('ts1');
      expect(item.employeeName).toBe('John Doe');
      expect(item.employeeId).toBe('emp1');
      expect(item.status).toBe('aprovado');
      expect(item.entryCount).toBe(2);
    });
  });

  describe('generateDetailedReport', () => {
    it('should generate detailed report with entries and annotations', () => {
      const filters: ReportFilters = {};
      const report = generateDetailedReport(mockTimesheets, filters);

      expect(report.title).toBe('Timesheet Detailed Report');
      expect(report.items.length).toBe(2);
    });

    it('should include entries in detailed report', () => {
      const report = generateDetailedReport(mockTimesheets, {});
      const item = report.items[0];

      expect(item.entries.length).toBe(2);
      expect(item.entries[0].tipo).toBe('embarque');
      expect(item.entries[1].tipo).toBe('desembarque');
    });

    it('should include annotations in detailed report', () => {
      const report = generateDetailedReport(mockTimesheets, {});
      const item = report.items[1];

      expect(item.annotations.length).toBe(1);
      expect(item.annotations[0].message).toBe('Invalid time');
    });

    it('should include approvals in detailed report', () => {
      const report = generateDetailedReport(mockTimesheets, {});
      const item = report.items[0];

      expect(item.approvals.length).toBe(1);
      expect(item.approvals[0].status).toBe('aprovado');
    });
  });

  describe('reportToCSV', () => {
    it('should convert summary report to CSV', () => {
      const report = generateSummaryReport(mockTimesheets, {});
      const csv = reportToCSV(report);

      expect(csv).toContain('Employee');
      expect(csv).toContain('Period');
      expect(csv).toContain('Status');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('Jane Smith');
      expect(csv).toContain('aprovado');
      expect(csv).toContain('recusado');
    });

    it('should convert detailed report to CSV', () => {
      const report = generateDetailedReport(mockTimesheets, {});
      const csv = reportToCSV(report);

      expect(csv).toContain('Employee');
      expect(csv).toContain('Date');
      expect(csv).toContain('Type');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('embarque');
      expect(csv).toContain('desembarque');
    });

    it('should properly escape CSV values', () => {
      const report = generateSummaryReport(mockTimesheets, {});
      const csv = reportToCSV(report);

      // Check that values are quoted
      expect(csv).toContain('"John Doe"');
      expect(csv).toContain('"Jane Smith"');
    });
  });

  describe('Report generation with filters', () => {
    it('should handle empty timesheets', () => {
      const report = generateSummaryReport([], {});

      expect(report.summary.totalTimesheets).toBe(0);
      expect(report.items.length).toBe(0);
    });

    it('should generate timestamp', () => {
      const report = generateSummaryReport(mockTimesheets, {});
      const timestamp = new Date(report.generatedAt);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});

