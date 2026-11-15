const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(authenticate);

router.get('/', approvalController.getPendingApprovals);
router.post('/:id/approve', authorize('ADMIN', 'FINANCE_MANAGER'), approvalController.approveInvoice);
router.post('/:id/reject', authorize('ADMIN', 'FINANCE_MANAGER'), approvalController.rejectInvoice);

module.exports = router;
