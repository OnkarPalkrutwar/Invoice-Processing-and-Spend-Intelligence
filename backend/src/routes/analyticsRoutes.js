const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/overview', analyticsController.getOverview);
router.get('/category', analyticsController.getCategoryAnalysis);
router.get('/vendors', analyticsController.getVendorAnalysis);
router.get('/monthly-trends', analyticsController.getMonthlyTrends);
router.get('/tax', analyticsController.getTaxAnalytics);
router.get('/outstanding', analyticsController.getOutstandingAnalysis);
router.get('/anomalies', analyticsController.getAnomalies);

module.exports = router;
