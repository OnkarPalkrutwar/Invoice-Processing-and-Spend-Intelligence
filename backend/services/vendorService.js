const Vendor = require('../models/Vendor');
const Invoice = require('../models/Invoice');

class VendorService {
  async getVendors(companyId, query = {}) {
    const filter = { companyId };
    if (query.search) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: regex }, { gstin: regex }, { email: regex }];
    }
    if (query.category) filter.category = query.category;
    return await Vendor.find(filter).sort({ name: 1 });
  }

  async getVendorById(vendorId, companyId) {
    return await Vendor.findOne({ _id: vendorId, companyId });
  }

  async getVendorSpendingStats(vendorId, companyId) {
    const invoices = await Invoice.find({ vendorId, companyId });
    const totalSpend = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const settledAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstanding = invoices.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);
    return {
      invoiceCount: invoices.length,
      totalSpend: Math.round(totalSpend * 100) / 100,
      settledAmount: Math.round(settledAmount * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
    };
  }
}

module.exports = new VendorService();
