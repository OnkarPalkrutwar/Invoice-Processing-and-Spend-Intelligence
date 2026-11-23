const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify/sync');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Vendor = require('../models/Vendor');
const { roundToTwo, formatINR } = require('../utils/currencyUtils');
const { formatDateIndian } = require('../utils/dateUtils');

class ReportService {
  /**
   * Filter and retrieve invoice dataset for reports
   */
  async getReportData(companyId, filters = {}) {
    const query = { companyId: new mongoose.Types.ObjectId(companyId) };

    if (filters.startDate || filters.endDate) {
      query.invoiceDate = {};
      if (filters.startDate) query.invoiceDate.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        query.invoiceDate.$lte = end;
      }
    }

    if (filters.vendorId) {
      query.vendorId = new mongoose.Types.ObjectId(filters.vendorId);
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.approvalStatus) {
      query.approvalStatus = filters.approvalStatus;
    }
    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    const invoices = await Invoice.find(query).sort({ invoiceDate: -1 });
    const company = await Company.findById(companyId);

    const totals = {
      count: invoices.length,
      subtotal: roundToTwo(invoices.reduce((a, b) => a + (b.subtotal || 0), 0)),
      taxAmount: roundToTwo(invoices.reduce((a, b) => a + (b.taxAmount || 0), 0)),
      totalAmount: roundToTwo(invoices.reduce((a, b) => a + (b.totalAmount || 0), 0)),
      paidAmount: roundToTwo(invoices.reduce((a, b) => a + (b.paidAmount || 0), 0)),
      remainingAmount: roundToTwo(invoices.reduce((a, b) => a + (b.remainingAmount || 0), 0)),
      cgst: roundToTwo(invoices.reduce((a, b) => a + (b.cgst || 0), 0)),
      sgst: roundToTwo(invoices.reduce((a, b) => a + (b.sgst || 0), 0)),
      igst: roundToTwo(invoices.reduce((a, b) => a + (b.igst || 0), 0)),
    };

    return { company, invoices, totals, filters };
  }

  /**
   * Generate CSV format string
   */
  async exportCsv(companyId, filters = {}) {
    const { invoices } = await this.getReportData(companyId, filters);

    const records = invoices.map((inv) => ({
      'Invoice Number': inv.invoiceNumber,
      'Vendor Name': inv.vendorName,
      'Invoice Date': formatDateIndian(inv.invoiceDate),
      'Due Date': formatDateIndian(inv.dueDate),
      'Category': inv.category,
      'Subtotal': inv.subtotal,
      'Tax Amount': inv.taxAmount,
      'Total Amount': inv.totalAmount,
      'Paid Amount': inv.paidAmount,
      'Remaining Balance': inv.remainingAmount,
      'Approval Status': inv.approvalStatus,
      'Payment Status': inv.paymentStatus,
    }));

    return stringify(records, { header: true });
  }

  /**
   * Generate Excel Workbook buffer
   */
  async exportExcel(companyId, filters = {}) {
    const { company, invoices, totals } = await this.getReportData(companyId, filters);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Invoices Summary');

    // Title & Header info
    sheet.addRow([company?.name || 'InvoScan Enterprise', 'Financial & Invoice Report']);
    sheet.addRow(['Generated Date:', new Date().toLocaleString('en-IN')]);
    sheet.addRow(['Total Invoices:', totals.count]);
    sheet.addRow(['Total Amount:', totals.totalAmount]);
    sheet.addRow(['Total Paid:', totals.paidAmount]);
    sheet.addRow(['Total Outstanding:', totals.remainingAmount]);
    sheet.addRow([]);

    // Table Headers
    const headerRow = sheet.addRow([
      'Invoice #',
      'Vendor',
      'Invoice Date',
      'Due Date',
      'Category',
      'Subtotal (₹)',
      'Tax (₹)',
      'Total (₹)',
      'Paid (₹)',
      'Outstanding (₹)',
      'Approval',
      'Payment Status',
    ]);

    headerRow.font = { bold: true };

    invoices.forEach((inv) => {
      sheet.addRow([
        inv.invoiceNumber,
        inv.vendorName,
        formatDateIndian(inv.invoiceDate),
        formatDateIndian(inv.dueDate),
        inv.category,
        inv.subtotal,
        inv.taxAmount,
        inv.totalAmount,
        inv.paidAmount,
        inv.remainingAmount,
        inv.approvalStatus,
        inv.paymentStatus,
      ]);
    });

    // Grand totals row
    const totalsRow = sheet.addRow([
      'GRAND TOTALS',
      '',
      '',
      '',
      '',
      totals.subtotal,
      totals.taxAmount,
      totals.totalAmount,
      totals.paidAmount,
      totals.remainingAmount,
      '',
      '',
    ]);
    totalsRow.font = { bold: true };

    // Format column widths
    sheet.columns.forEach((col) => {
      col.width = 16;
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate PDF document stream/buffer
   */
  async exportPdf(companyId, filters = {}, res) {
    const { company, invoices, totals } = await this.getReportData(companyId, filters);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice_Report_${Date.now()}.pdf"`
    );

    doc.pipe(res);

    // Header Branding
    doc
      .fillColor('#1e293b')
      .fontSize(20)
      .text(company?.name || 'Enterprise Invoices', { bold: true });
    doc
      .fillColor('#64748b')
      .fontSize(10)
      .text(`Invoice Processing & Spend Intelligence Report | Generated: ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown();

    // Summary Box
    doc
      .rect(40, doc.y, 515, 60)
      .fillAndStroke('#f8fafc', '#e2e8f0');

    const boxY = doc.y + 12;
    doc.fillColor('#0f172a').fontSize(11);
    doc.text(`Total Records: ${totals.count}`, 55, boxY);
    doc.text(`Total Spend: INR ${totals.totalAmount.toLocaleString('en-IN')}`, 180, boxY);
    doc.text(`Total Paid: INR ${totals.paidAmount.toLocaleString('en-IN')}`, 320, boxY);
    doc.text(`Outstanding: INR ${totals.remainingAmount.toLocaleString('en-IN')}`, 430, boxY);

    doc.moveDown(3);

    // Invoices Table
    doc.fillColor('#0f172a').fontSize(12).text('Recent Invoice Details:', 40, doc.y);
    doc.moveDown(0.5);

    // Table Header
    let currentY = doc.y;
    doc.fillColor('#475569').fontSize(9);
    doc.text('Invoice #', 40, currentY, { width: 70 });
    doc.text('Vendor', 115, currentY, { width: 110 });
    doc.text('Date', 230, currentY, { width: 60 });
    doc.text('Category', 295, currentY, { width: 70 });
    doc.text('Total (INR)', 370, currentY, { width: 60, align: 'right' });
    doc.text('Status', 445, currentY, { width: 55 });
    doc.text('Payment', 505, currentY, { width: 50 });

    doc.moveTo(40, currentY + 14).lineTo(555, currentY + 14).strokeColor('#cbd5e1').stroke();
    currentY += 20;

    // Display rows (up to 30 per report page cleanly)
    invoices.slice(0, 28).forEach((inv) => {
      doc.fillColor('#1e293b').fontSize(8);
      doc.text(inv.invoiceNumber, 40, currentY, { width: 70 });
      doc.text(inv.vendorName.substring(0, 20), 115, currentY, { width: 110 });
      doc.text(formatDateIndian(inv.invoiceDate), 230, currentY, { width: 60 });
      doc.text(inv.category, 295, currentY, { width: 70 });
      doc.text(inv.totalAmount.toLocaleString('en-IN'), 370, currentY, { width: 60, align: 'right' });
      doc.text(inv.approvalStatus, 445, currentY, { width: 55 });
      doc.text(inv.paymentStatus, 505, currentY, { width: 50 });
      currentY += 16;
    });

    if (invoices.length > 28) {
      doc.moveDown();
      doc.fillColor('#64748b').fontSize(8).text(`... and ${invoices.length - 28} more records. Export Excel/CSV for complete dataset.`);
    }

    doc.end();
  }
}

module.exports = new ReportService();
