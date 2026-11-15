const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { vendorValidator } = require('../validators/vendorValidator');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

router.use(authenticate);

router.get('/', vendorController.getVendors);
router.get('/:id', vendorController.getVendorById);
router.post('/', authorize('ADMIN', 'FINANCE_MANAGER'), vendorValidator, handleValidationErrors, vendorController.createVendor);
router.put('/:id', authorize('ADMIN', 'FINANCE_MANAGER'), vendorValidator, handleValidationErrors, vendorController.updateVendor);
router.delete('/:id', authorize('ADMIN'), vendorController.deleteVendor);

module.exports = router;
