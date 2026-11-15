import api from './api';

export const approvalService = {
  async getPendingApprovals() {
    const res = await api.get('/approvals');
    return res.data;
  },

  async approveInvoice(id, comments = '') {
    const res = await api.post(`/approvals/${id}/approve`, { comments });
    return res.data;
  },

  async rejectInvoice(id, reason) {
    const res = await api.post(`/approvals/${id}/reject`, { reason });
    return res.data;
  },
};
