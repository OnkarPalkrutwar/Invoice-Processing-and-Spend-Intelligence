const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/invoices', reportController.getInvoicesReport);
router.get('/export/pdf', reportController.exportPdf);
router.get('/export/excel', reportController.exportExcel);
router.get('/export/csv', reportController.exportCsv);

module.exports = router;
