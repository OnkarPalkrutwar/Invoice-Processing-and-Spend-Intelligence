const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', paymentController.getPayments);
router.post('/', authorize('ADMIN', 'FINANCE_MANAGER'), paymentController.recordPayment);
router.get('/invoice/:invoiceId', paymentController.getInvoicePayments);

module.exports = router;
