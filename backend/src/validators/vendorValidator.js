const { body } = require('express-validator');

const vendorValidator = [
  body('name').trim().notEmpty().withMessage('Vendor name is required.'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid vendor email.'),
  body('gstin')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('GSTIN must match standard Indian 15-character format (e.g. 27ABCDE1234F1Z5).'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
    .withMessage('Status must be ACTIVE, INACTIVE, or ARCHIVED.'),
];

module.exports = { vendorValidator };
