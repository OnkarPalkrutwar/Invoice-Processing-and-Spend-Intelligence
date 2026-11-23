const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema(
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
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewerName: {
      type: String,
      required: true,
    },
    reviewerRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['APPROVED', 'REJECTED', 'REQUESTED_CHANGES'],
      required: true,
    },
    comments: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

approvalSchema.index({ companyId: 1, invoiceId: 1 });

module.exports = mongoose.model('Approval', approvalSchema);
