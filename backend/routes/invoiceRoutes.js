const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { invoiceValidator } = require('../validators/invoiceValidator');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

router.use(authenticate);

router.get('/', invoiceController.getInvoices);
router.post('/upload', upload.single('file'), invoiceController.uploadInvoice);
router.get('/:id/document', invoiceController.getInvoiceDocument);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceValidator, handleValidationErrors, invoiceController.createInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', authorize('ADMIN', 'FINANCE_MANAGER'), invoiceController.deleteInvoice);

module.exports = router;
