/**
 * Decimal-safe currency calculations and Indian Rupee formatting
 */

const roundToTwo = (num) => {
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

const formatINR = (amount) => {
  const rounded = roundToTwo(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rounded);
};

const calculateGstBreakdown = (subtotal, taxPercentage, isInterState = false) => {
  const cleanSubtotal = roundToTwo(subtotal || 0);
  const rate = roundToTwo(taxPercentage || 0);
  const totalTax = roundToTwo((cleanSubtotal * rate) / 100);

  if (isInterState) {
    return {
      taxAmount: totalTax,
      igst: totalTax,
      cgst: 0,
      sgst: 0,
    };
  } else {
    const halfTax = roundToTwo(totalTax / 2);
    return {
      taxAmount: totalTax,
      igst: 0,
      cgst: halfTax,
      sgst: roundToTwo(totalTax - halfTax),
    };
  }
};

module.exports = {
  roundToTwo,
  formatINR,
  calculateGstBreakdown,
};
