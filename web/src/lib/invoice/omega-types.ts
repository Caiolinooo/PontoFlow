/**
 * OMEGA Invoice Types - Aligned with OMEGA-mapping-v1.md
 * 
 * This module defines types for invoice generation compatible with
 * the OMEGA Maximus Project Monthly Charge Rates format.
 */

/**
 * Employee information for OMEGA invoice
 */
export interface OmegaEmployee {
  name: string;
  id?: string;
  position: string;
}

/**
 * Vessel/embarcation information
 */
export interface OmegaVessel {
  name: string;
}

/**
 * Work period information
 */
export interface OmegaPeriod {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/**
 * Work hours/days information
 */
export interface OmegaWork {
  day_count: number;
  hours_regular: number;
  hours_overtime?: number;
}

/**
 * Rate information
 */
export interface OmegaRate {
  type: 'daily' | 'hourly';
  value: number;
  currency: 'USD' | 'BRL' | 'GBP';
}

/**
 * Brazilian Payroll Additionals (in BRL)
 */
export interface OmegaBrazilianPayroll {
  inss_brl: number;                        // Social Security INSS
  prior_notice_8_33_brl: number;           // Prior Notice Indemnified 8.33%
  fgts_fine_3_82_brl: number;              // FGTS Fine 3.82%
  inss_vacation_13th_5_6_brl: number;      // INSS on Vacation and 13th Salary 5.6%
  life_insurance_brl: number;              // Life Insurance
  aso_brl: number;                         // ASO (Occupational Health Certificate)
  hotels_brl: number;                      // Hotels
  total_brl: number;                       // Total BRL
}

/**
 * Foreign Exchange information
 */
export interface OmegaFX {
  gbp_rate: number;  // GBP exchange rate
}

/**
 * Complete OMEGA Invoice DTO
 */
export interface OmegaInvoiceDTO {
  // Tenant/Environment
  tenant_id: string;
  environment_slug: string;
  
  // Employee
  employee: OmegaEmployee;
  
  // Vessel/Location
  vessel: OmegaVessel;
  cost_center?: string;
  call_off?: string;
  
  // Period
  period: OmegaPeriod;
  
  // Work
  work: OmegaWork;
  
  // Rate
  rate: OmegaRate;
  
  // Amounts
  total_amount: number;
  expenses_gbp?: number;
  
  // Brazilian Payroll (optional)
  payroll?: OmegaBrazilianPayroll;
  payroll_additionals_gbp?: number;
  
  // FX (optional)
  fx?: OmegaFX;
  
  // Additional info
  notes?: string;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
}

/**
 * OMEGA CSV Row format
 */
export interface OmegaCSVRow {
  tenant_id: string;
  environment_slug: string;
  employee_name: string;
  employee_position: string;
  vessel_name: string;
  cost_center: string;
  call_off: string;
  period_start: string;
  period_end: string;
  day_count: number;
  hours_regular: number;
  hours_overtime: number;
  rate_type: string;
  rate_value: number;
  currency: string;
  total_amount: number;
  notes: string;
}

/**
 * Request to generate OMEGA invoice from timesheet
 */
export interface OmegaInvoiceGenerationRequest {
  timesheet_id: string;
  tenant_id: string;
  environment_slug: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  
  // Optional overrides
  rate_type?: 'daily' | 'hourly';
  rate_value?: number;
  currency?: 'USD' | 'BRL' | 'GBP';
  cost_center?: string;
  call_off?: string;
  notes?: string;
}

/**
 * OMEGA Invoice validation result
 */
export interface OmegaInvoiceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Export format options
 */
export type OmegaExportFormat = 'json' | 'csv' | 'pdf';

/**
 * Export options
 */
export interface OmegaExportOptions {
  format: OmegaExportFormat;
  include_payroll?: boolean;
  include_fx?: boolean;
}

