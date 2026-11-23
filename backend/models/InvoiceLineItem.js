const mongoose = require('mongoose');

const invoiceLineItemSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    hsnCode: {
      type: String,
      default: '',
      trim: true,
    },
    taxRate: {
      type: Number,
      default: 18,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InvoiceLineItem', invoiceLineItemSchema);
