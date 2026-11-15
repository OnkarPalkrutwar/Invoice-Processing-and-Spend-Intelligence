const analyticsService = require('../services/analyticsService');
const { successResponse } = require('../utils/response');

class AnalyticsController {
  async getOverview(req, res, next) {
    try {
      const { period = '3m' } = req.query;
      const data = await analyticsService.getSpendIntelligenceOverview(req.companyId, period);
      return successResponse(res, data, 'Spend intelligence overview loaded.');
    } catch (error) {
      next(error);
    }
  }

  async getCategoryAnalysis(req, res, next) {
    try {
      const { period = 'this_year' } = req.query;
      const data = await analyticsService.getCategorySpending(req.companyId, period);
      return successResponse(res, data, 'Category analysis retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getVendorAnalysis(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '10', 10);
      const data = await analyticsService.getTopVendors(req.companyId, limit);
      return successResponse(res, data, 'Vendor analysis retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyTrends(req, res, next) {
    try {
      const months = parseInt(req.query.months || '12', 10);
      const data = await analyticsService.getMonthlySpendingTrend(req.companyId, months);
      return successResponse(res, data, 'Monthly trend analytics retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getTaxAnalytics(req, res, next) {
    try {
      const { period = '3m' } = req.query;
      const overview = await analyticsService.getSpendIntelligenceOverview(req.companyId, period);
      return successResponse(res, overview.taxBreakdown, 'GST and tax analytics retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getOutstandingAnalysis(req, res, next) {
    try {
      const upcoming = await analyticsService.getUpcomingPayments(req.companyId, 15);
      return successResponse(res, upcoming, 'Outstanding liability analysis retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async getAnomalies(req, res, next) {
    try {
      const anomalies = await analyticsService.detectSpendingAnomalies(req.companyId);
      return successResponse(res, anomalies, 'Spending anomalies retrieved.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
