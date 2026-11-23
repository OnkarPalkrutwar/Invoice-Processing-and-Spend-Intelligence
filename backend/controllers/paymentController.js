const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

class PaymentController {
  /**
   * Get all payment history or payments for a specific invoice
   */
  async getPayments(req, res, next) {
    try {
      const { invoiceId, page = 1, limit = 15 } = req.query;
      const filter = { companyId: req.companyId };

      if (invoiceId) {
        filter.invoiceId = invoiceId;
      }

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ paymentDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('invoiceId', 'invoiceNumber vendorName totalAmount remainingAmount paymentStatus')
          .populate('recordedBy', 'name email'),
        Payment.countDocuments(filter),
      ]);

      return paginatedResponse(res, payments, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record new payment against an approved invoice
   */
  async recordPayment(req, res, next) {
    try {
      const { invoiceId, amount, paymentMethod, transactionReference, notes, paymentDate } = req.body;

      if (!invoiceId) {
        return errorResponse(res, 'Invoice ID is required to record a payment.', 400);
      }
      if (!amount || Number(amount) <= 0) {
        return errorResponse(res, 'Valid payment amount greater than zero is required.', 400);
      }

      const { payment, invoice } = await paymentService.recordPayment({
        invoiceId,
        companyId: req.companyId,
        userId: req.user._id,
        amount,
        paymentMethod,
        transactionReference,
        notes,
        paymentDate,
      });

      // Notification
      await notificationService.createNotification({
        companyId: req.companyId,
        type: 'PAYMENT_RECORDED',
        title: `Payment Recorded: ₹${amount}`,
        message: `Payment of ₹${amount} recorded for Invoice #${invoice.invoiceNumber} (${invoice.vendorName}). Remaining balance: ₹${invoice.remainingAmount}.`,
        link: `/invoices/${invoice._id}`,
      });

      return successResponse(
        res,
        { payment, invoice },
        'Payment recorded successfully.',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payments for a specific invoice
   */
  async getInvoicePayments(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const payments = await Payment.find({
        companyId: req.companyId,
        invoiceId,
      })
        .sort({ paymentDate: -1 })
        .populate('recordedBy', 'name email');

      return successResponse(res, payments, 'Invoice payment history retrieved.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
