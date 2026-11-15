const { body } = require('express-validator');

const invoiceValidator = [
  body('invoiceNumber').trim().notEmpty().withMessage('Invoice number is required.'),
  body('vendorName').trim().notEmpty().withMessage('Vendor name is required.'),
  body('invoiceDate').notEmpty().withMessage('Invoice date is required.'),
  body('dueDate').notEmpty().withMessage('Due date is required.'),
  body('totalAmount').isFloat({ min: 0.01 }).withMessage('Total amount must be greater than zero.'),
  body('subtotal').optional().isFloat({ min: 0 }).withMessage('Subtotal cannot be negative.'),
  body('taxAmount').optional().isFloat({ min: 0 }).withMessage('Tax amount cannot be negative.'),
  body('category')
    .optional()
    .isIn(['Software', 'Office Supplies', 'Hardware', 'Travel', 'Utilities', 'Marketing', 'Services', 'Other'])
    .withMessage('Category must be a valid predefined business category.'),
];

module.exports = { invoiceValidator };
