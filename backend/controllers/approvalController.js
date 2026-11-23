const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const InvoiceActivityLog = require('../models/InvoiceActivityLog');
const notificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/response');

class ApprovalController {
  /**
   * Get pending invoices awaiting approval
   */
  async getPendingApprovals(req, res, next) {
    try {
      const invoices = await Invoice.find({
        companyId: req.companyId,
        approvalStatus: { $in: ['PENDING_APPROVAL', 'UNDER_REVIEW'] },
      })
        .sort({ createdAt: -1 })
        .populate('vendorId', 'name gstin')
        .populate('submittedBy', 'name email');

      return successResponse(res, invoices, 'Pending approvals retrieved.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve an invoice (ADMIN or FINANCE_MANAGER only)
   */
  async approveInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const { comments = 'Approved by manager.' } = req.body;

      const invoice = await Invoice.findOne({ _id: id, companyId: req.companyId });
      if (!invoice) {
        return errorResponse(res, 'Invoice not found.', 404);
      }

      if (invoice.approvalStatus === 'APPROVED') {
        return errorResponse(res, 'This invoice is already approved.', 400);
      }

      invoice.approvalStatus = 'APPROVED';
      invoice.approvedBy = req.user._id;
      invoice.approvedAt = new Date();
      invoice.rejectionReason = '';
      await invoice.save();

      // Record approval history
      const approvalRecord = await Approval.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        reviewerId: req.user._id,
        reviewerName: req.user.name,
        reviewerRole: req.user.role,
        action: 'APPROVED',
        comments,
      });

      // Log activity
      await InvoiceActivityLog.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        userId: req.user._id,
        userName: req.user.name,
        action: 'APPROVED',
        details: { comments },
      });

      // Notify submitter if known
      await notificationService.createNotification({
        companyId: req.companyId,
        userId: invoice.submittedBy,
        type: 'INVOICE_APPROVED',
        title: `Invoice #${invoice.invoiceNumber} Approved`,
        message: `Invoice #${invoice.invoiceNumber} from ${invoice.vendorName} (₹${invoice.totalAmount}) was approved by ${req.user.name}.`,
        link: `/invoices/${invoice._id}`,
      });

      return successResponse(
        res,
        { invoice, approval: approvalRecord },
        `Invoice #${invoice.invoiceNumber} approved successfully.`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject an invoice (ADMIN or FINANCE_MANAGER only - requires mandatory rejection reason)
   */
  async rejectInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, comments } = req.body;

      const rejectionReason = reason || comments;
      if (!rejectionReason || !rejectionReason.trim()) {
        return errorResponse(res, 'A rejection reason is mandatory to reject an invoice.', 400);
      }

      const invoice = await Invoice.findOne({ _id: id, companyId: req.companyId });
      if (!invoice) {
        return errorResponse(res, 'Invoice not found.', 404);
      }

      invoice.approvalStatus = 'REJECTED';
      invoice.rejectionReason = rejectionReason.trim();
      invoice.approvedBy = null;
      invoice.approvedAt = null;
      await invoice.save();

      // Record approval history
      const approvalRecord = await Approval.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        reviewerId: req.user._id,
        reviewerName: req.user.name,
        reviewerRole: req.user.role,
        action: 'REJECTED',
        comments: rejectionReason.trim(),
      });

      // Log activity
      await InvoiceActivityLog.create({
        invoiceId: invoice._id,
        companyId: req.companyId,
        userId: req.user._id,
        userName: req.user.name,
        action: 'REJECTED',
        details: { reason: rejectionReason.trim() },
      });

      // Notify submitter
      await notificationService.createNotification({
        companyId: req.companyId,
        userId: invoice.submittedBy,
        type: 'INVOICE_REJECTED',
        title: `Invoice #${invoice.invoiceNumber} Rejected`,
        message: `Invoice #${invoice.invoiceNumber} from ${invoice.vendorName} was rejected. Reason: ${rejectionReason.trim()}`,
        link: `/invoices/${invoice._id}`,
      });

      return successResponse(
        res,
        { invoice, approval: approvalRecord },
        `Invoice #${invoice.invoiceNumber} rejected.`
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApprovalController();
