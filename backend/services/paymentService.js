const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Vendor = require('../models/Vendor');
const InvoiceActivityLog = require('../models/InvoiceActivityLog');
const { roundToTwo } = require('../utils/currencyUtils');

class PaymentService {
  /**
   * Record a payment and update invoice & vendor balances
   */
  async recordPayment({ invoiceId, companyId, userId, amount, paymentMethod, transactionReference, notes, paymentDate }) {
    const invoice = await Invoice.findOne({ _id: invoiceId, companyId });
    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    if (invoice.approvalStatus !== 'APPROVED') {
      throw new Error(`Invoice cannot be paid because it is not approved yet (Current status: ${invoice.approvalStatus}).`);
    }

    const payAmount = roundToTwo(Number(amount));
    if (payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (payAmount > roundToTwo(invoice.remainingAmount)) {
      throw new Error(`Payment amount (₹${payAmount}) exceeds the remaining invoice balance (₹${invoice.remainingAmount}).`);
    }

    // Create payment entry
    const payment = await Payment.create({
      invoiceId: invoice._id,
      companyId,
      recordedBy: userId,
      amount: payAmount,
      paymentMethod: paymentMethod || 'NEFT',
      transactionReference: transactionReference || '',
      notes: notes || '',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    });

    // Recalculate invoice payments
    const payments = await Payment.find({ invoiceId: invoice._id });
    const totalPaid = roundToTwo(payments.reduce((acc, p) => acc + p.amount, 0));
    const remainingAmount = roundToTwo(Math.max(0, invoice.totalAmount - totalPaid));

    let paymentStatus = 'UNPAID';
    if (remainingAmount <= 0) {
      paymentStatus = 'PAID';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (new Date(invoice.dueDate) < new Date() && remainingAmount > 0) {
      paymentStatus = 'OVERDUE';
    }

    invoice.paidAmount = totalPaid;
    invoice.remainingAmount = remainingAmount;
    invoice.paymentStatus = paymentStatus;
    await invoice.save();

    // Update vendor aggregates if linked
    if (invoice.vendorId) {
      await this.updateVendorBalances(invoice.vendorId, companyId);
    }

    // Log activity
    await InvoiceActivityLog.create({
      invoiceId: invoice._id,
      companyId,
      userId,
      action: 'PAYMENT_RECORDED',
      details: {
        paymentId: payment._id,
        amount: payAmount,
        remainingAmount,
        paymentStatus,
        method: paymentMethod,
      },
    });

    return { payment, invoice };
  }

  /**
   * Recalculate vendor totalSpent and totalOutstanding from its invoices
   */
  async updateVendorBalances(vendorId, companyId) {
    const stats = await Invoice.aggregate([
      { $match: { vendorId: vendorId, companyId: companyId } },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalSpent: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
        },
      },
    ]);

    const result = stats[0] || { totalInvoices: 0, totalSpent: 0, totalOutstanding: 0 };
    await Vendor.findByIdAndUpdate(vendorId, {
      totalInvoices: result.totalInvoices,
      totalSpent: roundToTwo(result.totalSpent),
      totalOutstanding: roundToTwo(result.totalOutstanding),
    });
  }

  /**
   * Sweep and update overdue invoices whose dueDate < now and remainingAmount > 0
   */
  async updateOverdueInvoices(companyId) {
    const now = new Date();
    await Invoice.updateMany(
      {
        companyId,
        dueDate: { $lt: now },
        remainingAmount: { $gt: 0 },
        paymentStatus: { $ne: 'OVERDUE' },
      },
      {
        $set: { paymentStatus: 'OVERDUE' },
      }
    );
  }
}

module.exports = new PaymentService();
