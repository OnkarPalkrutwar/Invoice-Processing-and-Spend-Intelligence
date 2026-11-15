import api from './api';

export const reportService = {
  async getInvoicesReport(filters = {}) {
    const res = await api.get('/reports/invoices', { params: filters });
    return res.data;
  },

  async downloadCsv(filters = {}) {
    const res = await api.get('/reports/export/csv', {
      params: filters,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async downloadExcel(filters = {}) {
    const res = await api.get('/reports/export/excel', {
      params: filters,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_Report_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async downloadPdf(filters = {}) {
    const res = await api.get('/reports/export/pdf', {
      params: filters,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_Report_${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
