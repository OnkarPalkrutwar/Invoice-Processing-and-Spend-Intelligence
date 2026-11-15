const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'INVOICE_UPLOADED',
        'OCR_COMPLETED',
        'OCR_FAILED',
        'REQUIRES_REVIEW',
        'INVOICE_APPROVED',
        'INVOICE_REJECTED',
        'PAYMENT_RECORDED',
        'PAYMENT_DUE',
        'PAYMENT_OVERDUE',
        'DUPLICATE_DETECTED',
        'ANOMALY_DETECTED',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ companyId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
