const mongoose = require('mongoose');

const invoiceActivityLogSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
      default: 'System',
    },
    action: {
      type: String,
      enum: [
        'UPLOADED',
        'OCR_PROCESSED',
        'REVIEWED',
        'EDITED',
        'APPROVED',
        'REJECTED',
        'PAYMENT_RECORDED',
        'STATUS_CHANGED',
      ],
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

invoiceActivityLogSchema.index({ invoiceId: 1, createdAt: -1 });

module.exports = mongoose.model('InvoiceActivityLog', invoiceActivityLogSchema);
