import { describe, it, expect } from 'vitest';
import {
  generateInvoice,
  validateInvoice,
  invoiceToJSON,
  invoiceToPDF,
} from '@/lib/invoice/generator';
import type { InvoiceGenerationRequest } from '@/lib/invoice/types';

describe('Invoice Generator', () => {
  const mockRequest: InvoiceGenerationRequest = {
    timesheetId: 'ts-123',
    employeeId: 'emp-456',
    periodStart: '2025-10-01',
    periodEnd: '2025-10-31',
    hourlyRate: 100,
    totalHours: 160,
    notes: 'Test invoice',
  };

  const mockCompanyData = {
    name: 'ABZ Group',
    email: 'billing@abzgroup.com',
    phone: '+55 11 1234-5678',
    taxId: '12.345.678/0001-90',
    registrationNumber: '123456789',
    address: {
      street: 'Rua Exemplo',
      number: '123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      country: 'Brazil',
    },
  };

  describe('generateInvoice', () => {
    it('should generate invoice with correct structure', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);

      expect(invoice).toHaveProperty('id');
      expect(invoice).toHaveProperty('invoiceNumber');
      expect(invoice).toHaveProperty('issueDate');
      expect(invoice).toHaveProperty('dueDate');
      expect(invoice).toHaveProperty('issuer');
      expect(invoice).toHaveProperty('recipient');
      expect(invoice).toHaveProperty('lineItems');
      expect(invoice).toHaveProperty('total');
    });

    it('should calculate correct totals', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);

      const expectedSubtotal = 160 * 100; // 16000
      const expectedTax = expectedSubtotal * 0.15; // 2400
      const expectedTotal = expectedSubtotal + expectedTax; // 18400

      expect(invoice.subtotal).toBe(expectedSubtotal);
      expect(invoice.taxAmount).toBe(expectedTax);
      expect(invoice.total).toBe(expectedTotal);
    });

    it('should set correct status', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      expect(invoice.status).toBe('draft');
    });

    it('should include line items', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);

      expect(invoice.lineItems.length).toBeGreaterThan(0);
      expect(invoice.lineItems[0]).toHaveProperty('description');
      expect(invoice.lineItems[0]).toHaveProperty('quantity');
      expect(invoice.lineItems[0]).toHaveProperty('unitPrice');
      expect(invoice.lineItems[0]).toHaveProperty('total');
    });

    it('should use default company data when not provided', () => {
      const invoice = generateInvoice(mockRequest, {});

      expect(invoice.issuer.name).toBe('ABZ Group');
      expect(invoice.issuer.email).toBe('billing@abzgroup.com');
    });
  });

  describe('validateInvoice', () => {
    it('should validate correct invoice', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      const result = validateInvoice(invoice);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing invoice number', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      invoice.invoiceNumber = '';

      const result = validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invoice number is required');
    });

    it('should detect missing issuer name', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      invoice.issuer.name = '';

      const result = validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Issuer name is required');
    });

    it('should detect negative amounts', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      invoice.subtotal = -100;

      const result = validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Subtotal cannot be negative');
    });

    it('should detect empty line items', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      invoice.lineItems = [];

      const result = validateInvoice(invoice);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one line item is required');
    });

    it('should warn about due date before issue date', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      invoice.dueDate = '2025-09-01';
      invoice.issueDate = '2025-10-01';

      const result = validateInvoice(invoice);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('invoiceToJSON', () => {
    it('should convert invoice to JSON string', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      const json = invoiceToJSON(invoice);

      expect(typeof json).toBe('string');
      expect(json).toContain(invoice.invoiceNumber);
    });

    it('should produce valid JSON', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      const json = invoiceToJSON(invoice);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all invoice data', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      const json = invoiceToJSON(invoice);
      const parsed = JSON.parse(json);

      expect(parsed.invoiceNumber).toBe(invoice.invoiceNumber);
      expect(parsed.total).toBe(invoice.total);
      expect(parsed.issuer.name).toBe(invoice.issuer.name);
    });
  });

  describe('invoiceToPDF', () => {
    it('should convert invoice to PDF buffer', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);
      const pdf = invoiceToPDF(invoice);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate unique invoice numbers', () => {
      const invoice1 = generateInvoice(mockRequest, mockCompanyData);
      const invoice2 = generateInvoice(mockRequest, mockCompanyData);

      expect(invoice1.invoiceNumber).not.toBe(invoice2.invoiceNumber);
    });

    it('should follow invoice number format', () => {
      const invoice = generateInvoice(mockRequest, mockCompanyData);

      expect(invoice.invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
    });
  });
});

