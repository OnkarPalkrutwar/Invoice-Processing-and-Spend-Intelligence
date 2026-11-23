const Approval = require('../models/Approval');
const Invoice = require('../models/Invoice');
const InvoiceActivityLog = require('../models/InvoiceActivityLog');

class ApprovalService {
  async getPendingQueue(companyId) {
    return await Approval.find({ status: 'PENDING' })
      .populate({
        path: 'invoiceId',
        match: { companyId },
        populate: [{ path: 'vendorId' }, { path: 'submittedBy', select: 'name email role' }],
      })
      .sort({ createdAt: -1 });
  }

  async processApproval(invoiceId, approverId, status, comments = '') {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return null;

    invoice.approvalStatus = status;
    if (status === 'APPROVED') {
      invoice.approvedBy = approverId;
      invoice.approvedAt = new Date();
    } else if (status === 'REJECTED') {
      invoice.rejectionReason = comments;
    }
    await invoice.save();

    await InvoiceActivityLog.create({
      invoiceId,
      performedBy: approverId,
      action: status === 'APPROVED' ? 'INVOICE_APPROVED' : 'INVOICE_REJECTED',
      details: comments ? `Decision notes: ${comments}` : 'Approved by authorized manager',
    });

    return invoice;
  }
}

module.exports = new ApprovalService();
