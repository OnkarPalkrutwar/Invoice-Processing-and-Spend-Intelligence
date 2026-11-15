const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    gstin: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    defaultCurrency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    financialYearStart: {
      type: String,
      default: '04-01', // April 1st standard Indian FY
    },
    settings: {
      invoicePrefix: { type: String, default: 'INV' },
      autoAnomalyDetection: { type: Boolean, default: true },
      duplicateThresholdDays: { type: Number, default: 45 },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Company', companySchema);
