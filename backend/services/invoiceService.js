const Invoice = require('../models/Invoice');
const InvoiceLineItem = require('../models/InvoiceLineItem');
const InvoiceActivityLog = require('../models/InvoiceActivityLog');
const { roundToTwo } = require('../utils/currencyUtils');

class InvoiceService {
  /**
   * Find invoice by ID with line items and activity logs
   */
  async getInvoiceDetails(invoiceId, companyId) {
    const invoice = await Invoice.findOne({ _id: invoiceId, companyId })
      .populate('vendorId')
      .populate('submittedBy', 'name email role')
      .populate('approvedBy', 'name email role');

    if (!invoice) return null;

    const [lineItems, activityLogs] = await Promise.all([
      InvoiceLineItem.find({ invoiceId }),
      InvoiceActivityLog.find({ invoiceId }).sort({ createdAt: -1 }),
    ]);

    return { invoice, lineItems, activityLogs };
  }

  /**
   * Calculate summary totals from line items
   */
  calculateTotals(lineItems, taxPercentage = 18, discount = 0) {
    let subtotal = 0;
    lineItems.forEach((item) => {
      subtotal += roundToTwo(item.quantity * item.unitPrice);
    });

    const taxAmount = roundToTwo((subtotal * taxPercentage) / 100);
    const totalAmount = roundToTwo(subtotal + taxAmount - discount);

    return {
      subtotal: roundToTwo(subtotal),
      taxAmount: roundToTwo(taxAmount),
      totalAmount: roundToTwo(totalAmount),
    };
  }

  /**
   * Log an audit trail entry for invoice lifecycle
   */
  async logActivity(invoiceId, userId, action, details) {
    try {
      return await InvoiceActivityLog.create({
        invoiceId,
        performedBy: userId,
        action,
        details,
      });
    } catch (e) {
      console.warn('[ActivityLog Error]:', e.message);
    }
  }
}

module.exports = new InvoiceService();
