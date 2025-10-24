import { InvoiceDTO, InvoiceGenerationRequest, InvoiceValidationResult, InvoiceAddress, InvoiceParty } from './types';

type CompanyData = Partial<InvoiceParty> & { address?: Partial<InvoiceAddress> };

/**
 * Generate invoice from timesheet data
 */
export function generateInvoice(request: InvoiceGenerationRequest, companyData: CompanyData): InvoiceDTO {
  const subtotal = request.totalHours * request.hourlyRate;
  const taxRate = 0.15; // 15% tax
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const invoice: InvoiceDTO = {
    id: `INV-${Date.now()}`,
    invoiceNumber: generateInvoiceNumber(),
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: 'BRL',
    status: 'draft',

    issuer: {
      name: companyData.name || 'ABZ Group',
      email: companyData.email || 'billing@abzgroup.com',
      phone: companyData.phone,
      address: companyData.address || {
        street: 'Rua Exemplo',
        number: '123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brazil',
      },
      taxId: companyData.taxId,
      registrationNumber: companyData.registrationNumber,
    },

    recipient: {
      name: request.employeeId,
      email: '',
      address: {
        street: '',
        number: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Brazil',
      },
    },

    lineItems: [
      {
        id: '1',
        description: `Timesheet Services - ${request.periodStart} to ${request.periodEnd}`,
        quantity: request.totalHours,
        unitPrice: request.hourlyRate,
        total: subtotal,
      },
    ],

    subtotal,
    taxRate,
    taxAmount,
    total,

    notes: request.notes || 'Thank you for your business',
    paymentTerms: 'Net 30',
    bankDetails: {
      bankName: 'Banco do Brasil',
      accountNumber: '12345-6',
    },

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return invoice;
}

/**
 * Validate invoice data
 */
export function validateInvoice(invoice: InvoiceDTO): InvoiceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!invoice.invoiceNumber) errors.push('Invoice number is required');
  if (!invoice.issueDate) errors.push('Issue date is required');
  if (!invoice.dueDate) errors.push('Due date is required');
  if (!invoice.issuer.name) errors.push('Issuer name is required');
  if (!invoice.recipient.name) errors.push('Recipient name is required');
  if (invoice.lineItems.length === 0) errors.push('At least one line item is required');

  // Validate amounts
  if (invoice.subtotal < 0) errors.push('Subtotal cannot be negative');
  if (invoice.taxAmount < 0) errors.push('Tax amount cannot be negative');
  if (invoice.total < 0) errors.push('Total cannot be negative');

  // Validate line items
  invoice.lineItems.forEach((item, index) => {
    if (!item.description) errors.push(`Line item ${index + 1}: description is required`);
    if (item.quantity <= 0) errors.push(`Line item ${index + 1}: quantity must be positive`);
    if (item.unitPrice < 0) errors.push(`Line item ${index + 1}: unit price cannot be negative`);
  });

  // Validate dates
  const issueDate = new Date(invoice.issueDate);
  const dueDate = new Date(invoice.dueDate);
  if (dueDate < issueDate) warnings.push('Due date is before issue date');

  // Validate tax rate
  if (invoice.taxRate < 0 || invoice.taxRate > 1) {
    errors.push('Tax rate must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Convert invoice to PDF format (placeholder)
 */
export function invoiceToPDF(invoice: InvoiceDTO): Buffer {
  // In production, use a library like pdfkit or puppeteer
  // For now, return a placeholder as UTF-8 bytes
  const content = JSON.stringify(invoice, null, 2);
  return Buffer.from(content);
}

/**
 * Convert invoice to JSON
 */
export function invoiceToJSON(invoice: InvoiceDTO): string {
  return JSON.stringify(invoice, null, 2);
}

/**
 * Generate unique invoice number
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

