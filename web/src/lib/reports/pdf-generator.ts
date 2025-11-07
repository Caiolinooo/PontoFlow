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
  // Check if we're in a serverless environment (Netlify, Vercel, etc.)
  const isServerless = process.env.NETLIFY === 'true' ||
                       process.env.VERCEL === '1' ||
                       process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;

  // In serverless environments, skip Puppeteer entirely and use PDFKit
  if (isServerless) {
    console.log('[PDF] Serverless environment detected, using PDFKit directly');
    try {
      const pdfBuffer = await generateReportPDFWithPDFKit(report, options);
      console.log('[PDF] Successfully generated PDF with PDFKit');
      return pdfBuffer;
    } catch (error) {
      console.error('[PDF] PDFKit generation failed:', error);
      throw new Error('Failed to generate PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  // In non-serverless environments, try Puppeteer first with PDFKit fallback
  try {
    console.log('[PDF] Attempting PDF generation with Puppeteer...');
    const pdfBuffer = await generateReportPDFWithPuppeteer(report, options);
    console.log('[PDF] Successfully generated PDF with Puppeteer');
    return pdfBuffer;
  } catch (error) {
    console.warn('[PDF] Puppeteer failed, falling back to PDFKit:', error);
    try {
      const pdfBuffer = await generateReportPDFWithPDFKit(report, options);
      console.log('[PDF] Successfully generated PDF with PDFKit');
      return pdfBuffer;
    } catch (fallbackError) {
      console.error('[PDF] Both Puppeteer and PDFKit failed:', fallbackError);
      throw new Error('Failed to generate PDF: ' + (fallbackError instanceof Error ? fallbackError.message : 'Unknown error'));
    }
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

  console.log('[PDFKit] Starting PDF generation...');

  const t = getReportTranslations(locale);

  let PDFDocument: any;
  try {
    PDFDocument = require('pdfkit');
    console.log('[PDFKit] PDFKit module loaded successfully');
  } catch (error) {
    console.error('[PDFKit] Failed to load pdfkit module:', error);
    throw new Error('PDFKit module not available: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }

  let doc: any;
  try {
    doc = new PDFDocument({ size: 'A4', margin: 50 });
    console.log('[PDFKit] PDFDocument instance created');
  } catch (error) {
    console.error('[PDFKit] Failed to create PDFDocument:', error);
    throw new Error('Failed to create PDF document: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }

  // Create a buffer to store the PDF
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => {
      console.log('[PDFKit] PDF generation completed, buffer size:', Buffer.concat(chunks).length);
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', (err: Error) => {
      console.error('[PDFKit] PDF document error:', err);
      reject(err);
    });
  });

  const isSummary = 'summary' in report;

  try {
    console.log('[PDFKit] Generating PDF content...');

  // Add header
  doc.fontSize(18).fillColor('#0E6FFF').text(companyName, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor('#000000').text(isSummary ? t.summaryReportTitle : t.detailedReportTitle, { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#666666').text(`${t.generatedAt}: ${formatDate(new Date(), locale)}`, { align: 'left' });
  doc.moveDown(1);

  if (employeeName || employeeId) {
    doc.fontSize(11).fillColor('#000000').text(t.employeeLabel + ':', { underline: true });
    if (employeeName) doc.fontSize(10).fillColor('#333333').text(`${t.employeeLabel}: ${employeeName}`);
    if (employeeId) doc.fontSize(10).text(`${t.idLabel}: ${employeeId}`);
    doc.moveDown();
  }

  if (isSummary) {
    const summary = (report as SummaryReport).summary;
    const summaryTitle = locale === 'pt-BR' ? 'Resumo' : 'Summary';
    doc.fontSize(11).fillColor('#000000').text(summaryTitle + ':', { underline: true });
    doc.fontSize(10).fillColor('#333333');
    doc.text(`${t.total}: ${summary.totalTimesheets}`);
    doc.text(`${t.approved_plural}: ${summary.approved}`);
    doc.text(`${t.pending}: ${summary.pending}`);
    doc.text(`${t.rejected_plural}: ${summary.rejected}`);
    if (summary.totalHours) {
      doc.text(`${t.totalHours}: ${summary.totalHours.toFixed(2)}h`);
    }
    doc.moveDown(1);
  }

  // Table layout
  const tableTop = doc.y;
  const rowHeight = 20;
  const margin = 50;

  // Define column widths based on page width
  const pageWidth = doc.page.width - (margin * 2);

  if (isSummary) {
    // Summary table columns
    const colWidths = {
      employee: pageWidth * 0.25,
      period: pageWidth * 0.20,
      status: pageWidth * 0.15,
      entries: pageWidth * 0.10,
      normal: pageWidth * 0.10,
      extra: pageWidth * 0.10,
      total: pageWidth * 0.10
    };

    let xPos = margin;

    // Draw header
    doc.fontSize(9).fillColor('#FFFFFF');
    doc.rect(margin, tableTop, pageWidth, rowHeight).fillAndStroke('#0E6FFF', '#0E6FFF');

    doc.text(t.employee, xPos + 5, tableTop + 5, { width: colWidths.employee - 10, align: 'left' });
    xPos += colWidths.employee;
    doc.text(t.period, xPos + 5, tableTop + 5, { width: colWidths.period - 10, align: 'left' });
    xPos += colWidths.period;
    doc.text(t.status, xPos + 5, tableTop + 5, { width: colWidths.status - 10, align: 'left' });
    xPos += colWidths.status;
    doc.text(t.entries, xPos + 5, tableTop + 5, { width: colWidths.entries - 10, align: 'center' });
    xPos += colWidths.entries;
    doc.text(t.normalHours, xPos + 5, tableTop + 5, { width: colWidths.normal - 10, align: 'right' });
    xPos += colWidths.normal;
    doc.text(t.extraHours, xPos + 5, tableTop + 5, { width: colWidths.extra - 10, align: 'right' });
    xPos += colWidths.extra;
    doc.text(t.totalHours, xPos + 5, tableTop + 5, { width: colWidths.total - 10, align: 'right' });

    doc.moveDown();

    // Draw rows
    const summaryReport = report as SummaryReport;
    let currentY = tableTop + rowHeight;

    summaryReport.items.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = margin;
      }

      xPos = margin;
      doc.fontSize(8).fillColor('#000000');

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(margin, currentY, pageWidth, rowHeight).fillAndStroke('#F9FAFB', '#E5E7EB');
      } else {
        doc.rect(margin, currentY, pageWidth, rowHeight).stroke('#E5E7EB');
      }

      doc.text(item.employeeName || 'N/A', xPos + 5, currentY + 5, { width: colWidths.employee - 10, align: 'left' });
      xPos += colWidths.employee;
      doc.text(item.period || 'N/A', xPos + 5, currentY + 5, { width: colWidths.period - 10, align: 'left' });
      xPos += colWidths.period;
      doc.text(translateStatus(item.status, locale), xPos + 5, currentY + 5, { width: colWidths.status - 10, align: 'left' });
      xPos += colWidths.status;
      doc.text((item.entryCount || 0).toString(), xPos + 5, currentY + 5, { width: colWidths.entries - 10, align: 'center' });
      xPos += colWidths.entries;
      doc.text(`${(item.normalHours || 0).toFixed(2)}h`, xPos + 5, currentY + 5, { width: colWidths.normal - 10, align: 'right' });
      xPos += colWidths.normal;
      doc.text(`${(item.extraHours || 0).toFixed(2)}h`, xPos + 5, currentY + 5, { width: colWidths.extra - 10, align: 'right' });
      xPos += colWidths.extra;
      doc.text(`${(item.totalHours || 0).toFixed(2)}h`, xPos + 5, currentY + 5, { width: colWidths.total - 10, align: 'right' });

      currentY += rowHeight;
    });
  } else {
    // Detailed report
    const detailedReport = report as DetailedReport;
    let currentY = tableTop;

    detailedReport.items.forEach((item) => {
      // Check if we need a new page
      if (currentY > doc.page.height - 150) {
        doc.addPage();
        currentY = margin;
      }

      // Timesheet header
      doc.fontSize(10).fillColor('#000000');
      doc.rect(margin, currentY, pageWidth, 25).fillAndStroke('#F3F4F6', '#E5E7EB');
      doc.text(`${item.timesheet.employeeName} - ${item.timesheet.period}`, margin + 5, currentY + 8, { width: pageWidth - 10 });

      // Show total hours for this timesheet
      if (item.timesheet.totalHours) {
        doc.text(`${t.totalHours}: ${item.timesheet.totalHours.toFixed(2)}h`, { align: 'right' });
      }

      currentY += 25;

      // Entry rows
      if (item.entries.length === 0) {
        doc.fontSize(9).fillColor('#666666').text('No entries', margin + 5, currentY + 5);
        currentY += 20;
      } else {
        item.entries.forEach((entry) => {
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = margin;
          }

          doc.fontSize(8).fillColor('#333333');
          const entryText = `${formatDateOnly(entry.data, locale)} | ${entry.hora_ini || '-'} - ${entry.hora_fim || '-'} | ${entry.tipo || '-'}`;
          doc.text(entryText, margin + 10, currentY + 5, { width: pageWidth - 20 });

          if (entry.observacao) {
            currentY += 15;
            doc.fontSize(7).fillColor('#666666').text(`  ${entry.observacao}`, margin + 15, currentY, { width: pageWidth - 30 });
          }

          currentY += 20;
        });
      }

      currentY += 10; // Space between timesheets
    });
  }

    // Add footer
    const footerY = doc.page.height - 40;
    doc.fontSize(8).fillColor('#9CA3AF');
    doc.text(`${t.autoGenerated} ${companyName}`, margin, footerY, { align: 'center', width: pageWidth });
    doc.text(`${t.pageGenerated} ${formatDate(new Date(), locale)}`, margin, footerY + 10, { align: 'center', width: pageWidth });

    console.log('[PDFKit] PDF content generated successfully, finalizing...');
    doc.end();
  } catch (contentError) {
    console.error('[PDFKit] Error generating PDF content:', contentError);
    // Try to close the document even if there was an error
    try {
      doc.end();
    } catch (endError) {
      console.error('[PDFKit] Error closing document:', endError);
    }
    throw new Error('Failed to generate PDF content: ' + (contentError instanceof Error ? contentError.message : 'Unknown error'));
  }

  return await pdfPromise;
}