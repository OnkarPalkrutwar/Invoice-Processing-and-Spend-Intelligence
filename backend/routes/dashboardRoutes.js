const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/summary', dashboardController.getSummary);
router.get('/monthly-spending', dashboardController.getMonthlySpending);
router.get('/category-spending', dashboardController.getCategorySpending);
router.get('/vendor-spending', dashboardController.getVendorSpending);
router.get('/invoice-status', dashboardController.getInvoiceStatus);
router.get('/recent-invoices', dashboardController.getRecentInvoices);
router.get('/upcoming-payments', dashboardController.getUpcomingPayments);

module.exports = router;
