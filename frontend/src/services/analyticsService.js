import api from './api';

export const analyticsService = {
  async getDashboardSummary(period = '30d') {
    const res = await api.get('/dashboard/summary', { params: { period } });
    return res.data;
  },

  async getMonthlySpending(months = 12) {
    const res = await api.get('/dashboard/monthly-spending', { params: { months } });
    return res.data;
  },

  async getCategorySpending(period = 'this_year') {
    const res = await api.get('/dashboard/category-spending', { params: { period } });
    return res.data;
  },

  async getVendorSpending() {
    const res = await api.get('/dashboard/vendor-spending');
    return res.data;
  },

  async getInvoiceStatus() {
    const res = await api.get('/dashboard/invoice-status');
    return res.data;
  },

  async getRecentInvoices(limit = 7) {
    const res = await api.get('/dashboard/recent-invoices', { params: { limit } });
    return res.data;
  },

  async getUpcomingPayments() {
    const res = await api.get('/dashboard/upcoming-payments');
    return res.data;
  },

  // Spend Intelligence
  async getSpendIntelligenceOverview(period = '3m') {
    const res = await api.get('/analytics/overview', { params: { period } });
    return res.data;
  },

  async getTaxAnalytics(period = '3m') {
    const res = await api.get('/analytics/tax', { params: { period } });
    return res.data;
  },

  async getAnomalies() {
    const res = await api.get('/analytics/anomalies');
    return res.data;
  },
};
