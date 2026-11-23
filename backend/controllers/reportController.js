const reportService = require('../services/reportService');
const { successResponse } = require('../utils/response');

class ReportController {
  async getInvoicesReport(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        vendorId: req.query.vendorId,
        category: req.query.category,
        approvalStatus: req.query.approvalStatus,
        paymentStatus: req.query.paymentStatus,
      };

      const data = await reportService.getReportData(req.companyId, filters);
      return successResponse(res, data, 'Report data retrieved.');
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const filters = req.query;
      const csvData = await reportService.exportCsv(req.companyId, filters);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice_Summary_${Date.now()}.csv"`);
      return res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  async exportExcel(req, res, next) {
    try {
      const filters = req.query;
      const buffer = await reportService.exportExcel(req.companyId, filters);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Invoice_Summary_${Date.now()}.xlsx"`
      );
      return res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async exportPdf(req, res, next) {
    try {
      const filters = req.query;
      await reportService.exportPdf(req.companyId, filters, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportController();
