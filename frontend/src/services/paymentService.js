import api from './api';

export const paymentService = {
  async getPayments(params = {}) {
    const res = await api.get('/payments', { params });
    return res.data;
  },

  async recordPayment(data) {
    const res = await api.post('/payments', data);
    return res.data;
  },

  async getInvoicePayments(invoiceId) {
    const res = await api.get(`/payments/invoice/${invoiceId}`);
    return res.data;
  },
};
