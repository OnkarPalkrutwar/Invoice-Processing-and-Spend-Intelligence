const Invoice = require('../models/Invoice');
const { roundToTwo } = require('../utils/currencyUtils');

class DuplicateDetectionService {
  /**
   * Check for potential duplicates against existing invoices in the same company
   * @param {Object} params
   * @param {ObjectId} params.companyId
   * @param {string} params.vendorName
   * @param {ObjectId} [params.vendorId]
   * @param {string} params.invoiceNumber
   * @param {number} params.totalAmount
   * @param {Date|string} params.invoiceDate
   * @param {ObjectId} [params.currentInvoiceId] Exclude self when updating
   */
  async checkDuplicate({ companyId, vendorName, vendorId, invoiceNumber, totalAmount, invoiceDate, currentInvoiceId = null }) {
    if (!companyId) return { isDuplicate: false, reason: null };

    const queryFilter = { companyId };
    if (currentInvoiceId) {
      queryFilter._id = { $ne: currentInvoiceId };
    }

    const cleanInvoiceNumber = (invoiceNumber || '').trim().toUpperCase();
    const cleanAmount = roundToTwo(Number(totalAmount) || 0);
    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();

    // 1. Exact Match: Same Invoice Number & Vendor
    if (cleanInvoiceNumber && (vendorId || vendorName)) {
      const vendorCondition = vendorId
        ? { $or: [{ vendorId }, { vendorName: new RegExp(`^${vendorName.trim()}$`, 'i') }] }
        : { vendorName: new RegExp(`^${vendorName.trim()}$`, 'i') };

      const exactMatch = await Invoice.findOne({
        ...queryFilter,
        invoiceNumber: cleanInvoiceNumber,
        ...vendorCondition,
      }).select('_id invoiceNumber vendorName invoiceDate totalAmount approvalStatus');

      if (exactMatch) {
        return {
          isDuplicate: true,
          reason: `Duplicate detected: An invoice with number '${cleanInvoiceNumber}' from vendor '${exactMatch.vendorName}' already exists (Status: ${exactMatch.approvalStatus}, Amount: ₹${exactMatch.totalAmount}).`,
          matchedInvoiceId: exactMatch._id,
        };
      }
    }

    // 2. Fuzzy Pattern Match: Same Vendor and Exact Same Amount within +/- 45 Days
    if (cleanAmount > 0 && (vendorId || vendorName) && !isNaN(invDate.getTime())) {
      const windowStart = new Date(invDate);
      windowStart.setDate(windowStart.getDate() - 45);
      const windowEnd = new Date(invDate);
      windowEnd.setDate(windowEnd.getDate() + 45);

      const vendorCondition = vendorId
        ? { $or: [{ vendorId }, { vendorName: new RegExp(`^${vendorName.trim()}$`, 'i') }] }
        : { vendorName: new RegExp(`^${vendorName.trim()}$`, 'i') };

      const fuzzyMatch = await Invoice.findOne({
        ...queryFilter,
        ...vendorCondition,
        totalAmount: cleanAmount,
        invoiceDate: { $gte: windowStart, $lte: windowEnd },
      }).select('_id invoiceNumber vendorName invoiceDate totalAmount approvalStatus');

      if (fuzzyMatch) {
        return {
          isDuplicate: true,
          reason: `Potential duplicate: Found existing invoice #${fuzzyMatch.invoiceNumber} for the identical amount of ₹${cleanAmount} from ${fuzzyMatch.vendorName} dated around the same period.`,
          matchedInvoiceId: fuzzyMatch._id,
        };
      }
    }

    return {
      isDuplicate: false,
      reason: null,
      matchedInvoiceId: null,
    };
  }
}

module.exports = new DuplicateDetectionService();
