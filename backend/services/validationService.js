const { roundToTwo } = require('../utils/currencyUtils');

// Indian GSTIN regex pattern: 2 digits (state code), 5 letters (PAN), 4 digits, 1 letter, 1 entity code, 'Z', 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

class ValidationService {
  /**
   * Validate invoice fields and return array of validation warnings/errors
   * @param {Object} invoiceData 
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  validateInvoice(invoiceData) {
    const errors = [];

    // 1. Missing mandatory invoice number
    if (!invoiceData.invoiceNumber || !invoiceData.invoiceNumber.trim()) {
      errors.push('Invoice number is missing.');
    }

    // 2. Missing vendor
    if (!invoiceData.vendorName || !invoiceData.vendorName.trim()) {
      errors.push('Vendor name is missing.');
    }

    // 3. Date validation
    if (!invoiceData.invoiceDate) {
      errors.push('Invoice date is missing.');
    }
    if (!invoiceData.dueDate) {
      errors.push('Due date is missing.');
    }
    if (invoiceData.invoiceDate && invoiceData.dueDate) {
      const invDate = new Date(invoiceData.invoiceDate);
      const dueDate = new Date(invoiceData.dueDate);
      if (isNaN(invDate.getTime())) {
        errors.push('Invoice date is invalid.');
      }
      if (isNaN(dueDate.getTime())) {
        errors.push('Due date is invalid.');
      }
      if (dueDate < invDate) {
        errors.push('Due date cannot precede the invoice issuance date.');
      }
    }

    // 4. Amount validation
    const totalAmount = roundToTwo(Number(invoiceData.totalAmount) || 0);
    const subtotal = roundToTwo(Number(invoiceData.subtotal) || 0);
    const taxAmount = roundToTwo(Number(invoiceData.taxAmount) || 0);
    const discount = roundToTwo(Number(invoiceData.discount) || 0);

    if (totalAmount <= 0) {
      errors.push('Total invoice amount must be greater than zero.');
    }
    if (subtotal < 0) {
      errors.push('Subtotal cannot be negative.');
    }
    if (taxAmount < 0) {
      errors.push('Tax amount cannot be negative.');
    }
    if (discount < 0) {
      errors.push('Discount cannot be negative.');
    }

    // 5. Total amount math check
    if (subtotal > 0 && totalAmount > 0) {
      const calculatedExpected = roundToTwo(subtotal + taxAmount - discount);
      const difference = Math.abs(calculatedExpected - totalAmount);
      // Allow minor rounding difference of up to 1 INR / minor rounding unit
      if (difference > 1.0) {
        errors.push(
          `Total amount mismatch: Subtotal (${subtotal}) + Tax (${taxAmount}) - Discount (${discount}) equals ${calculatedExpected}, but total is stated as ${totalAmount}.`
        );
      }
    }

    // 6. GSTIN validation if present
    if (invoiceData.gstin) {
      const cleanGstin = invoiceData.gstin.trim().toUpperCase();
      if (!GSTIN_REGEX.test(cleanGstin)) {
        errors.push(`Invalid GSTIN format: '${cleanGstin}'. Must follow standard 15-character Indian GST format (e.g., 27ABCDE1234F1Z5).`);
      }
    }

    // 7. Line items validation
    if (invoiceData.lineItems && Array.isArray(invoiceData.lineItems) && invoiceData.lineItems.length > 0) {
      invoiceData.lineItems.forEach((item, index) => {
        if (!item.description || !item.description.trim()) {
          errors.push(`Line item #${index + 1} has an empty description.`);
        }
        if (Number(item.quantity) <= 0) {
          errors.push(`Line item #${index + 1} quantity must be greater than 0.`);
        }
        if (Number(item.unitPrice) < 0) {
          errors.push(`Line item #${index + 1} unit price cannot be negative.`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  isValidGstin(gstin) {
    if (!gstin) return false;
    return GSTIN_REGEX.test(gstin.trim().toUpperCase());
  }
}

module.exports = new ValidationService();
