const analyticsService = require('../services/analyticsService');
const Invoice = require('../models/Invoice');
const { successResponse } = require('../utils/response');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const { period = '30d' } = req.query;
      const data = await analyticsService.getDashboardSummary(req.companyId, period);
      return successResponse(res, data, 'Dashboard summary loaded successfully.');
    } catch (error) {
      next(error);
    }
  }

  async getMonthlySpending(req, res, next) {
    try {
      const { months = 12 } = req.query;
      const data = await analyticsService.getMonthlySpendingTrend(req.companyId, parseInt(months, 10));
      return successResponse(res, data, 'Monthly spending trend retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getCategorySpending(req, res, next) {
    try {
      const { period = 'this_year' } = req.query;
      const data = await analyticsService.getCategorySpending(req.companyId, period);
      return successResponse(res, data, 'Category spending retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getVendorSpending(req, res, next) {
    try {
      const data = await analyticsService.getTopVendors(req.companyId, 5);
      return successResponse(res, data, 'Top vendors retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceStatus(req, res, next) {
    try {
      const data = await analyticsService.getInvoiceStatusDistribution(req.companyId);
      return successResponse(res, data, 'Invoice status distribution retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getRecentInvoices(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '7', 10);
      const invoices = await Invoice.find({ companyId: req.companyId })
        .sort({ invoiceDate: -1, createdAt: -1 })
        .limit(limit)
        .populate('vendorId', 'name gstin');

      return successResponse(res, invoices, 'Recent invoices retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getUpcomingPayments(req, res, next) {
    try {
      const upcoming = await analyticsService.getUpcomingPayments(req.companyId, 5);
      return successResponse(res, upcoming, 'Upcoming payments retrieved.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
