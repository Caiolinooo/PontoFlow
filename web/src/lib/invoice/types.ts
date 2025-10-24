/**
 * Invoice Types and DTOs
 */

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceAddress {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface InvoiceParty {
  name: string;
  email: string;
  phone?: string;
  address: InvoiceAddress;
  taxId?: string;
  registrationNumber?: string;
}

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  
  issuer: InvoiceParty;
  recipient: InvoiceParty;
  
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  
  notes?: string;
  paymentTerms?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    routingNumber?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceGenerationRequest {
  timesheetId: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  hourlyRate: number;
  totalHours: number;
  notes?: string;
}

export interface InvoiceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

