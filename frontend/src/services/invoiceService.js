import api from './api';

export const invoiceService = {
  async getInvoices(params = {}) {
    const res = await api.get('/invoices', { params });
    return res.data;
  },

  async getInvoiceById(id) {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },

  async uploadInvoice(formData, onProgress) {
    const res = await api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return res.data;
  },

  async createInvoice(data) {
    const res = await api.post('/invoices', data);
    return res.data;
  },

  async updateInvoice(id, data) {
    const res = await api.put(`/invoices/${id}`, data);
    return res.data;
  },

  async deleteInvoice(id) {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },

  getDocumentUrl(id) {
    return `/api/invoices/${id}/document`;
  },
};
