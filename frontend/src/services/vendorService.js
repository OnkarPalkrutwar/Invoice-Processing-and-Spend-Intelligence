import api from './api';

export const vendorService = {
  async getVendors(params = {}) {
    const res = await api.get('/vendors', { params });
    return res.data;
  },

  async getVendorById(id) {
    const res = await api.get(`/vendors/${id}`);
    return res.data;
  },

  async createVendor(data) {
    const res = await api.post('/vendors', data);
    return res.data;
  },

  async updateVendor(id, data) {
    const res = await api.put(`/vendors/${id}`, data);
    return res.data;
  },

  async deleteVendor(id) {
    const res = await api.delete(`/vendors/${id}`);
    return res.data;
  },
};
