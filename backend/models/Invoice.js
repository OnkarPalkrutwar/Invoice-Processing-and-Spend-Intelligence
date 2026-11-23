const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      index: true,
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      required: [true, 'Invoice date is required'],
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    category: {
      type: String,
      required: true,
      enum: ['Software', 'Office Supplies', 'Hardware', 'Travel', 'Utilities', 'Marketing', 'Services', 'Other'],
      default: 'Services',
    },
    poNumber: {
      type: String,
      default: '',
      trim: true,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    taxPercentage: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    cgst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    igst: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    approvalStatus: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'UPLOADED',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'],
      default: 'UNPAID',
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: function () {
        return this.totalAmount || 0;
      },
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvoiceDocument',
    },
    originalDocumentUrl: {
      type: String,
      default: '',
    },
    originalDocumentName: {
      type: String,
      default: '',
    },
    ocrRawData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ocrConfidence: {
      type: Number,
      default: 1.0,
    },
    isDuplicateWarning: {
      type: Boolean,
      default: false,
    },
    duplicateReason: {
      type: String,
      default: '',
    },
    validationErrors: {
      type: [String],
      default: [],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 });
invoiceSchema.index({ companyId: 1, vendorId: 1 });
invoiceSchema.index({ companyId: 1, invoiceDate: -1 });
invoiceSchema.index({ companyId: 1, approvalStatus: 1 });
invoiceSchema.index({ companyId: 1, paymentStatus: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
