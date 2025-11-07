import { SummaryReport, DetailedReport } from './generator';
import { getReportTranslations, translateStatus, formatDate, formatDateOnly, ReportLocale } from './translations';
import PDFDocument from 'pdfkit';

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
          <td class="text-right">${(item.normalHours || 0).toFixed(2)}h</td>
          <td class="text-right">${(item.extraHours || 0).toFixed(2)}h</td>
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
            <th class="text-right">${t.normalHours}</th>
            <th class="text-right">${t.extraHours}</th>
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
 * Generate PDF from report using Puppeteer (more reliable for standalone builds)
 */
export async function generateReportPDF(
  report: SummaryReport | DetailedReport,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  try {
    return await generateReportPDFWithPuppeteer(report, options);
  } catch (error) {
    console.warn('[PDF] Puppeteer failed, falling back to PDFKit:', error);
    return await generateReportPDFWithPDFKit(report, options);
  }
}

/**
 * Generate PDF using Puppeteer browser automation
 */
async function generateReportPDFWithPuppeteer(
  report: SummaryReport | DetailedReport,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Generate HTML content
    const html = generateReportHTML(report, options);

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '50px',
        right: '50px',
        bottom: '50px',
        left: '50px'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Generate PDF from report using PDFKit (fallback)
 */
async function generateReportPDFWithPDFKit(
  report: SummaryReport | DetailedReport,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const {
    companyName = 'PontoFlow',
    employeeName = '',
    employeeId = '',
    locale = 'pt-BR',
  } = options;

  const t = getReportTranslations(locale);
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  // Create a buffer to store the PDF
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  // Add content to the PDF
  doc.fontSize(18).text(companyName, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(12).text(t.summaryReportTitle, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated: ${formatDate(new Date(), locale)}`, { align: 'left' });
  doc.moveDown();

  if (employeeName || employeeId) {
    doc.fontSize(12).text('Employee Information:', { underline: true });
    if (employeeName) doc.text(`Name: ${employeeName}`);
    if (employeeId) doc.text(`ID: ${employeeId}`);
    doc.moveDown();
  }

  const isSummary = 'summary' in report;

  if (isSummary) {
    const summary = (report as SummaryReport).summary;
    doc.fontSize(12).text('Summary:', { underline: true });
    doc.text(`Total: ${summary.totalTimesheets}`);
    doc.text(`Approved: ${summary.approved}`);
    doc.text(`Pending: ${summary.pending}`);
    doc.text(`Rejected: ${summary.rejected}`);
    doc.moveDown();
  }

  // Add table header
  doc.fontSize(12).text('Data', 50, doc.y, { width: 100, align: 'left' });
  doc.text('Period', 150, doc.y, { width: 100, align: 'left' });
  doc.text('Status', 250, doc.y, { width: 100, align: 'left' });
  doc.text('Entries', 350, doc.y, { width: 100, align: 'left' });
  doc.text('Total Hours', 450, doc.y, { width: 100, align: 'left' });
  doc.moveDown();

  // Add table data
  if (isSummary) {
    const summaryReport = report as SummaryReport;
    summaryReport.items.forEach((item) => {
      doc.fontSize(10).text(item.employeeName, 50, doc.y, { width: 100, align: 'left' });
      doc.text(item.period, 150, doc.y, { width: 100, align: 'left' });
      doc.text(translateStatus(item.status, locale), 250, doc.y, { width: 100, align: 'left' });
      doc.text(item.entryCount.toString(), 350, doc.y, { width: 100, align: 'left' });
      doc.text(`${(item.totalHours || 0).toFixed(2)}h`, 450, doc.y, { width: 100, align: 'left' });
      doc.moveDown();
    });
  } else {
    const detailedReport = report as DetailedReport;
    detailedReport.items.forEach((item) => {
      doc.fontSize(11).text(`${item.timesheet.employeeName} - ${item.timesheet.period}`, { underline: true });
      doc.moveDown(0.5);
      item.entries.forEach((entry) => {
        doc.fontSize(9).text(formatDateOnly(entry.data, locale), 50, doc.y, { width: 100, align: 'left' });
        doc.text(entry.hora_ini || '-', 150, doc.y, { width: 100, align: 'left' });
        doc.text(entry.hora_fim || '-', 250, doc.y, { width: 100, align: 'left' });
        doc.text(entry.tipo || '-', 350, doc.y, { width: 100, align: 'left' });
        doc.text(entry.observacao || '-', 450, doc.y, { width: 100, align: 'left' });
        doc.moveDown();
      });
      doc.moveDown();
    });
  }

  // Add footer
  doc.moveDown();
  doc.fontSize(8).text(`${t.autoGenerated} ${companyName}`, 50, doc.page.height - 50, { align: 'center' });

  doc.end();

  return await pdfPromise;
}