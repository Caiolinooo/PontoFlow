/**
 * OMEGA Invoice Integration Tests
 * 
 * Tests the complete flow of generating OMEGA-compliant invoices
 * from timesheet data.
 */

import { describe, it, expect } from 'vitest';
import {
  generateOmegaInvoice,
  validateOmegaInvoice,
  omegaInvoiceToCSV,
  omegaInvoiceToJSON,
  exportOmegaInvoice,
} from '@/lib/invoice/omega-generator';
import type { OmegaInvoiceGenerationRequest } from '@/lib/invoice/omega-types';

describe('OMEGA Invoice Integration', () => {
  const mockTimesheetData = {
    id: 'timesheet-123',
    employee_id: 'emp-456',
    employee: {
      full_name: 'John Doe',
      position: 'Senior Engineer',
    },
    vessel: {
      name: 'Vessel Alpha',
    },
    periodo_ini: '2024-10-01',
    periodo_fim: '2024-10-31',
    entries: [
      {
        id: 'entry-1',
        entry_date: '2024-10-01',
        tipo: 'embarque',
        hours_regular: 8,
        hours_overtime: 0,
      },
      {
        id: 'entry-2',
        entry_date: '2024-10-02',
        tipo: 'embarque',
        hours_regular: 8,
        hours_overtime: 2,
      },
      {
        id: 'entry-3',
        entry_date: '2024-10-03',
        tipo: 'desembarque',
        hours_regular: 8,
        hours_overtime: 0,
      },
    ],
    cost_center: 'CC-001',
    call_off: 'CO-2024-001',
    notes: 'Test timesheet',
  };

  const mockRequest: OmegaInvoiceGenerationRequest = {
    timesheet_id: 'timesheet-123',
    tenant_id: 'tenant-789',
    environment_slug: 'omega',
    employee_id: 'emp-456',
    period_start: '2024-10-01',
    period_end: '2024-10-31',
    rate_type: 'daily',
    rate_value: 150.00,
    currency: 'GBP',
    cost_center: 'CC-001',
    call_off: 'CO-2024-001',
    notes: 'Test invoice',
  };

  describe('generateOmegaInvoice', () => {
    it('should generate a valid OMEGA invoice from timesheet data', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      expect(invoice).toBeDefined();
      expect(invoice.tenant_id).toBe('tenant-789');
      expect(invoice.environment_slug).toBe('omega');
      expect(invoice.employee.name).toBe('John Doe');
      expect(invoice.employee.position).toBe('Senior Engineer');
      expect(invoice.vessel.name).toBe('Vessel Alpha');
      expect(invoice.period.start).toBe('2024-10-01');
      expect(invoice.period.end).toBe('2024-10-31');
    });

    it('should calculate work metrics correctly', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      expect(invoice.work.day_count).toBe(3); // 3 entries
      expect(invoice.work.hours_regular).toBe(24); // 8 + 8 + 8
      expect(invoice.work.hours_overtime).toBe(2); // 0 + 2 + 0
    });

    it('should calculate total amount for daily rate', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      // 3 days * 150 GBP/day = 450 GBP
      expect(invoice.total_amount).toBe(450.00);
    });

    it('should calculate total amount for hourly rate', async () => {
      const hourlyRequest = {
        ...mockRequest,
        rate_type: 'hourly' as const,
        rate_value: 20.00,
      };

      const invoice = await generateOmegaInvoice(hourlyRequest, mockTimesheetData);

      // 24 hours * 20 GBP/hour = 480 GBP
      expect(invoice.total_amount).toBe(480.00);
    });

    it('should include cost center and call off', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      expect(invoice.cost_center).toBe('CC-001');
      expect(invoice.call_off).toBe('CO-2024-001');
    });

    it('should include notes', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      expect(invoice.notes).toBe('Test invoice');
    });

    it('should set created_at and updated_at timestamps', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      expect(invoice.created_at).toBeDefined();
      expect(invoice.updated_at).toBeDefined();
      expect(new Date(invoice.created_at!)).toBeInstanceOf(Date);
      expect(new Date(invoice.updated_at!)).toBeInstanceOf(Date);
    });
  });

  describe('validateOmegaInvoice', () => {
    it('should validate a correct invoice', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const validation = validateOmegaInvoice(invoice);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidInvoice = {
        tenant_id: '',
        environment_slug: '',
        employee: { name: '', position: '' },
        vessel: { name: '' },
        period: { start: '', end: '' },
        work: { day_count: 0, hours_regular: 0 },
        rate: { type: 'daily', value: 0, currency: 'GBP' },
        total_amount: 0,
      };

      const validation = validateOmegaInvoice(invalidInvoice as any);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('tenant_id is required');
      expect(validation.errors).toContain('environment_slug is required');
      expect(validation.errors).toContain('employee.name is required');
      expect(validation.errors).toContain('employee.position is required');
      expect(validation.errors).toContain('vessel.name is required');
    });

    it('should detect invalid period', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      invoice.period.end = '2024-09-30'; // Before start date

      const validation = validateOmegaInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('period.end must be after period.start');
    });

    it('should detect negative values', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      invoice.work.day_count = -1;
      invoice.work.hours_regular = -10;
      invoice.rate.value = -50;
      invoice.total_amount = -100;

      const validation = validateOmegaInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('work.day_count cannot be negative');
      expect(validation.errors).toContain('work.hours_regular cannot be negative');
      expect(validation.errors).toContain('rate.value cannot be negative');
      expect(validation.errors).toContain('total_amount cannot be negative');
    });

    it('should detect invalid rate type', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      invoice.rate.type = 'invalid' as 'daily' | 'hourly';

      const validation = validateOmegaInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('rate.type must be "daily" or "hourly"');
    });

    it('should detect invalid currency', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      invoice.rate.currency = 'EUR' as 'USD' | 'BRL' | 'GBP';

      const validation = validateOmegaInvoice(invoice);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('rate.currency must be USD, BRL, or GBP');
    });

    it('should warn about zero values', async () => {
      const zeroRequest = {
        ...mockRequest,
        rate_value: 0,
      };

      const zeroTimesheetData = {
        ...mockTimesheetData,
        entries: [],
      };

      const invoice = await generateOmegaInvoice(zeroRequest, zeroTimesheetData);
      const validation = validateOmegaInvoice(invoice);

      expect(validation.warnings).toContain('No work days or hours recorded');
      expect(validation.warnings).toContain('Rate value is zero');
      expect(validation.warnings).toContain('Total amount is zero');
    });
  });

  describe('omegaInvoiceToCSV', () => {
    it('should convert invoice to CSV format', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const csv = omegaInvoiceToCSV([invoice]);

      expect(csv).toContain('tenant_id,environment_slug,employee_name');
      expect(csv).toContain('tenant-789');
      expect(csv).toContain('omega');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('Senior Engineer');
      expect(csv).toContain('Vessel Alpha');
      expect(csv).toContain('CC-001');
      expect(csv).toContain('CO-2024-001');
    });

    it('should handle multiple invoices', async () => {
      const invoice1 = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const invoice2 = await generateOmegaInvoice(
        { ...mockRequest, employee_id: 'emp-789' },
        { ...mockTimesheetData, employee: { full_name: 'Jane Smith', position: 'Manager' } }
      );

      const csv = omegaInvoiceToCSV([invoice1, invoice2]);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(3); // Header + 2 data rows
      expect(lines[1]).toContain('John Doe');
      expect(lines[2]).toContain('Jane Smith');
    });

    it('should escape commas in values', async () => {
      const dataWithCommas = {
        ...mockTimesheetData,
        notes: 'Test, with, commas',
      };

      const invoice = await generateOmegaInvoice(
        { ...mockRequest, notes: 'Test, with, commas' },
        dataWithCommas
      );
      const csv = omegaInvoiceToCSV([invoice]);

      expect(csv).toContain('"Test, with, commas"');
    });
  });

  describe('omegaInvoiceToJSON', () => {
    it('should convert invoice to JSON format', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const json = omegaInvoiceToJSON(invoice);

      const parsed = JSON.parse(json);
      expect(parsed.tenant_id).toBe('tenant-789');
      expect(parsed.employee.name).toBe('John Doe');
      expect(parsed.total_amount).toBe(450.00);
    });

    it('should produce pretty-printed JSON', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const json = omegaInvoiceToJSON(invoice);

      expect(json).toContain('\n'); // Pretty-printed
      expect(json).toContain('  '); // Indented
    });
  });

  describe('exportOmegaInvoice', () => {
    it('should export as JSON', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const exported = exportOmegaInvoice(invoice, { format: 'json' });

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported as string);
      expect(parsed.tenant_id).toBe('tenant-789');
    });

    it('should export as CSV', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const exported = exportOmegaInvoice(invoice, { format: 'csv' });

      expect(typeof exported).toBe('string');
      expect(exported).toContain('tenant_id,environment_slug');
    });

    it('should export as PDF (placeholder)', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);
      const exported = exportOmegaInvoice(invoice, { format: 'pdf' });

      expect(exported).toBeInstanceOf(Buffer);
    });

    it('should throw error for unsupported format', async () => {
      const invoice = await generateOmegaInvoice(mockRequest, mockTimesheetData);

      expect(() => {
        exportOmegaInvoice(invoice, { format: 'xml' as 'json' | 'csv' | 'pdf' });
      }).toThrow('Unsupported export format: xml');
    });
  });
});

