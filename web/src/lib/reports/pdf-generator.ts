import { SummaryReport, DetailedReport } from './generator';
import { getReportTranslations, translateStatus, formatDate, formatDateOnly, ReportLocale } from './translations';

interface PDFGenerationOptions {
  companyName?: string;
  companyLogo?: string;
  watermarkText?: string;
  employeeName?: string;
  employeeId?: string;
  companyDocument?: string;
  companyAddress?: string;
  locale?: ReportLocale;
}

/**
 * Generate HTML template for PDF report
 */
export function generateReportHTML(
  report: SummaryReport | DetailedReport,
  options: PDFGenerationOptions = {}
): string {
  const {
    companyName = 'PontoFlow',
    companyLogo = '',
    watermarkText = '',
    employeeName = '',
    employeeId = '',
    companyDocument = '',
    companyAddress = '',
    locale = 'pt-BR',
  } = options;

  const t = getReportTranslations(locale);
  const isSummary = 'summary' in report;
  const generatedDate = formatDate(report.generatedAt, locale);

  // Generate table rows based on report type
  let tableRows = '';

  if (isSummary) {
    const summaryReport = report as SummaryReport;
    tableRows = summaryReport.items
      .map(
        (item) => `
        <tr>
          <td>${item.employeeName}</td>
          <td>${item.period}</td>
          <td><span class="status status-${item.status}">${translateStatus(item.status, locale)}</span></td>
          <td class="text-center">${item.entryCount}</td>
          <td class="text-right">${(item.totalHours || 0).toFixed(2)}h</td>
        </tr>
      `
      )
      .join('');
  } else {
    const detailedReport = report as DetailedReport;
    tableRows = detailedReport.items
      .map(
        (item) => `
        <tr class="timesheet-header">
          <td colspan="5">
            <strong>${item.timesheet.employeeName}</strong> - ${item.timesheet.period}
            <span class="status status-${item.timesheet.status}">${translateStatus(item.timesheet.status, locale)}</span>
          </td>
        </tr>
        ${item.entries
          .map(
            (entry) => `
          <tr class="entry-row">
            <td>${formatDateOnly(entry.data, locale)}</td>
            <td>${entry.hora_ini || '-'}</td>
            <td>${entry.hora_fim || '-'}</td>
            <td>${entry.tipo || '-'}</td>
            <td>${entry.observacao || '-'}</td>
          </tr>
        `
          )
          .join('')}
      `
      )
      .join('');
  }

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1f2937;
      background: white;
      padding: 20mm;
      font-size: 10pt;
    }
    
    .container {
      position: relative;
      max-width: 100%;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      color: rgba(0, 0, 0, 0.05);
      font-weight: bold;
      white-space: nowrap;
      pointer-events: none;
      z-index: -1;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 3px solid #0E6FFF;
    }
    
    .header-left {
      flex: 1;
    }
    
    .header-right {
      text-align: right;
    }
    
    .logo {
      max-height: 60px;
      max-width: 200px;
      margin-bottom: 10px;
    }
    
    .company-name {
      font-size: 18pt;
      font-weight: bold;
      color: #0E6FFF;
      margin-bottom: 5px;
    }
    
    .company-info {
      font-size: 9pt;
      color: #6b7280;
      line-height: 1.4;
    }
    
    .report-title {
      font-size: 16pt;
      font-weight: bold;
      margin: 20px 0 10px;
      color: #111827;
    }
    
    .report-meta {
      font-size: 9pt;
      color: #6b7280;
      margin-bottom: 20px;
    }
    
    .employee-info {
      background: #f3f4f6;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 9pt;
    }
    
    .employee-info strong {
      color: #374151;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9pt;
    }
    
    th {
      background: #0E6FFF;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
    }
    
    td {
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .timesheet-header td {
      background: #f3f4f6;
      font-weight: 600;
      padding: 10px 8px;
    }
    
    .entry-row {
      font-size: 8pt;
    }
    
    .status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
    }
    
    .status-rascunho {
      background: #f3f4f6;
      color: #6b7280;
    }
    
    .status-enviado {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-aprovado {
      background: #d1fae5;
      color: #065f46;
    }
    
    .status-recusado {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .status-bloqueado {
      background: #e5e7eb;
      color: #374151;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-right {
      text-align: right;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      font-size: 8pt;
      color: #9ca3af;
      text-align: center;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    
    .stat-label {
      font-size: 8pt;
      color: #6b7280;
      margin-bottom: 5px;
    }
    
    .stat-value {
      font-size: 16pt;
      font-weight: bold;
      color: #0E6FFF;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${watermarkText ? `<div class="watermark">${watermarkText}</div>` : ''}
  
  <div class="container">
    <div class="header">
      <div class="header-left">
        ${companyLogo ? `<img src="${companyLogo}" alt="Logo" class="logo" />` : ''}
        <div class="company-name">${companyName}</div>
        ${companyDocument ? `<div class="company-info">CNPJ: ${companyDocument}</div>` : ''}
        ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
      </div>
      <div class="header-right">
        <div class="report-meta">${t.generatedAt}: ${generatedDate}</div>
      </div>
    </div>

    <h1 class="report-title">${isSummary ? t.summaryReportTitle : t.detailedReportTitle}</h1>

    ${
      employeeName || employeeId
        ? `
    <div class="employee-info">
      ${employeeName ? `<div><strong>${t.employeeLabel}:</strong> ${employeeName}</div>` : ''}
      ${employeeId ? `<div><strong>${t.idLabel}:</strong> ${employeeId}</div>` : ''}
    </div>
    `
        : ''
    }
    
    ${
      isSummary && (report as SummaryReport).summary
        ? `
    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-label">${t.total}</div>
        <div class="stat-value">${(report as SummaryReport).summary.totalTimesheets}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t.approved_plural}</div>
        <div class="stat-value">${(report as SummaryReport).summary.approved}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t.pending}</div>
        <div class="stat-value">${(report as SummaryReport).summary.pending}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t.rejected_plural}</div>
        <div class="stat-value">${(report as SummaryReport).summary.rejected}</div>
      </div>
    </div>
    `
        : ''
    }
    
    <table>
      <thead>
        <tr>
          ${
            isSummary
              ? `
            <th>${t.employee}</th>
            <th>${t.period}</th>
            <th>${t.status}</th>
            <th class="text-center">${t.entries}</th>
            <th class="text-right">${t.totalHours}</th>
          `
              : `
            <th>${t.date}</th>
            <th>${t.startTime}</th>
            <th>${t.endTime}</th>
            <th>${t.type}</th>
            <th>${t.comment}</th>
          `
          }
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <div class="footer">
      <p>${t.autoGenerated} ${companyName}</p>
      <p>${t.pageGenerated} ${generatedDate}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF from report using Puppeteer
 */
export async function generateReportPDF(
  report: SummaryReport | DetailedReport,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const html = generateReportHTML(report, options);
  
  // Dynamic import to avoid bundling issues
  const puppeteer = await import('puppeteer');
  
  const browser = await puppeteer.default.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });
    
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

