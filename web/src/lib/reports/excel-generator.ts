import ExcelJS from 'exceljs';
import { SummaryReport, DetailedReport } from './generator';
import { getReportTranslations, translateStatus, formatDate, formatDateOnly, ReportLocale } from './translations';

interface ExcelGenerationOptions {
  companyName?: string;
  companyLogo?: string;
  employeeName?: string;
  employeeId?: string;
  companyDocument?: string;
  companyAddress?: string;
  locale?: ReportLocale;
}

/**
 * Generate Excel file from report
 */
export async function generateReportExcel(
  report: SummaryReport | DetailedReport,
  options: ExcelGenerationOptions = {}
): Promise<Buffer> {
  const {
    companyName = 'PontoFlow',
    employeeName = '',
    employeeId = '',
    companyDocument = '',
    companyAddress = '',
    locale = 'pt-BR',
  } = options;

  const t = getReportTranslations(locale);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(locale === 'en-GB' ? 'Report' : 'Relatório', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Set column widths
  worksheet.columns = [
    { width: 30 },
    { width: 20 },
    { width: 15 },
    { width: 12 },
    { width: 15 },
  ];

  let currentRow = 1;

  // Company Header
  const titleRow = worksheet.getRow(currentRow);
  titleRow.getCell(1).value = companyName;
  titleRow.getCell(1).font = { size: 18, bold: true, color: { argb: 'FF0E6FFF' } };
  titleRow.height = 25;
  currentRow++;

  if (companyDocument) {
    const docRow = worksheet.getRow(currentRow);
    docRow.getCell(1).value = `CNPJ: ${companyDocument}`;
    docRow.getCell(1).font = { size: 10, color: { argb: 'FF6B7280' } };
    currentRow++;
  }

  if (companyAddress) {
    const addrRow = worksheet.getRow(currentRow);
    addrRow.getCell(1).value = companyAddress;
    addrRow.getCell(1).font = { size: 10, color: { argb: 'FF6B7280' } };
    currentRow++;
  }

  currentRow++; // Empty row

  const isSummary = 'summary' in report;

  // Report Title
  const reportTitleRow = worksheet.getRow(currentRow);
  reportTitleRow.getCell(1).value = isSummary ? t.summaryReportTitle : t.detailedReportTitle;
  reportTitleRow.getCell(1).font = { size: 14, bold: true };
  currentRow++;

  // Generated Date
  const dateRow = worksheet.getRow(currentRow);
  dateRow.getCell(1).value = `${t.generatedAt}: ${formatDate(report.generatedAt, locale)}`;
  dateRow.getCell(1).font = { size: 9, color: { argb: 'FF6B7280' } };
  currentRow++;

  // Employee Info
  if (employeeName || employeeId) {
    currentRow++; // Empty row
    if (employeeName) {
      const empNameRow = worksheet.getRow(currentRow);
      empNameRow.getCell(1).value = `${t.employeeLabel}: ${employeeName}`;
      empNameRow.getCell(1).font = { size: 10, bold: true };
      currentRow++;
    }
    if (employeeId) {
      const empIdRow = worksheet.getRow(currentRow);
      empIdRow.getCell(1).value = `${t.idLabel}: ${employeeId}`;
      empIdRow.getCell(1).font = { size: 10 };
      currentRow++;
    }
  }

  currentRow++; // Empty row

  // Summary Statistics (for summary reports)
  if (isSummary && (report as SummaryReport).summary) {
    const summary = (report as SummaryReport).summary;

    const statsRow = worksheet.getRow(currentRow);
    statsRow.values = [t.total, t.approved_plural, t.pending, t.rejected_plural, t.draft_plural];
    statsRow.font = { bold: true, size: 11 };
    statsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    };
    currentRow++;

    const valuesRow = worksheet.getRow(currentRow);
    valuesRow.values = [
      summary.totalTimesheets,
      summary.approved,
      summary.pending,
      summary.rejected,
      summary.draft,
    ];
    valuesRow.font = { size: 12, bold: true, color: { argb: 'FF0E6FFF' } };
    currentRow++;
    currentRow++; // Empty row
  }

  // Table Header
  const headerRow = worksheet.getRow(currentRow);
  if (isSummary) {
    headerRow.values = [t.employee, t.period, t.status, t.entries, t.totalHours];
  } else {
    headerRow.values = [t.date, t.startTime, t.endTime, t.type, t.comment];
  }
  
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0E6FFF' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 20;
  currentRow++;

  // Table Data
  if (isSummary) {
    const summaryReport = report as SummaryReport;
    summaryReport.items.forEach((item) => {
      const row = worksheet.getRow(currentRow);
      row.values = [
        item.employeeName,
        item.period,
        translateStatus(item.status, locale),
        item.entryCount,
        `${(item.totalHours || 0).toFixed(2)}h`,
      ];
      
      // Apply status color
      const statusCell = row.getCell(3);
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getStatusColor(item.status) },
      };
      
      row.alignment = { vertical: 'middle' };
      row.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      currentRow++;
    });
  } else {
    const detailedReport = report as DetailedReport;
    detailedReport.items.forEach((item) => {
      // Timesheet header
      const headerRow = worksheet.getRow(currentRow);
      headerRow.getCell(1).value = `${item.timesheet.employeeName} - ${item.timesheet.period}`;
      headerRow.getCell(1).font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      
      const statusCell = headerRow.getCell(3);
      statusCell.value = translateStatus(item.timesheet.status, locale);
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getStatusColor(item.timesheet.status) },
      };

      worksheet.mergeCells(currentRow, 1, currentRow, 2);
      currentRow++;

      // Entries
      item.entries.forEach((entry) => {
        const row = worksheet.getRow(currentRow);
        row.values = [
          formatDateOnly(entry.data, locale),
          entry.hora_ini || '-',
          entry.hora_fim || '-',
          entry.tipo || '-',
          entry.observacao || '-',
        ];
        row.font = { size: 9 };
        row.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        currentRow++;
      });
    });
  }

  currentRow++; // Empty row

  // Footer
  const footerRow = worksheet.getRow(currentRow);
  footerRow.getCell(1).value = `Este documento foi gerado automaticamente pelo sistema ${companyName}`;
  footerRow.getCell(1).font = { size: 8, color: { argb: 'FF9CA3AF' }, italic: true };
  footerRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(currentRow, 1, currentRow, 5);

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Get status color for Excel cells
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    rascunho: 'FFF3F4F6',
    enviado: 'FFFEF3C7',
    aprovado: 'FFD1FAE5',
    recusado: 'FFFEE2E2',
    bloqueado: 'FFE5E7EB',
    draft: 'FFF3F4F6',
    submitted: 'FFFEF3C7',
    approved: 'FFD1FAE5',
    rejected: 'FFFEE2E2',
    locked: 'FFE5E7EB',
  };
  return colors[status.toLowerCase()] || 'FFFFFFFF';
}

