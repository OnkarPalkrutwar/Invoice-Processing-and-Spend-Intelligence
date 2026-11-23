const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Vendor = require('../models/Vendor');
const { roundToTwo } = require('../utils/currencyUtils');
const { getDateRange } = require('../utils/dateUtils');

class AnalyticsService {
  /**
   * Get main dashboard KPI cards and comparison trends
   */
  async getDashboardSummary(companyId, filterRange = '30d') {
    const cid = new mongoose.Types.ObjectId(companyId);
    const { startDate, endDate } = getDateRange(filterRange);

    // Calculate previous period for trend comparisons
    const periodDuration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodDuration);
    const prevEndDate = new Date(startDate.getTime());

    // Current period invoices
    const currentInvoices = await Invoice.find({
      companyId: cid,
      invoiceDate: { $gte: startDate, $lte: endDate },
    });

    // Previous period invoices
    const prevInvoices = await Invoice.find({
      companyId: cid,
      invoiceDate: { $gte: prevStartDate, $lte: prevEndDate },
    });

    const totalInvoicesCurrent = currentInvoices.length;
    const totalInvoicesPrev = prevInvoices.length;

    const totalSpendingCurrent = roundToTwo(
      currentInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0)
    );
    const totalSpendingPrev = roundToTwo(
      prevInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0)
    );

    // Lifetime / Active status counters for company
    const allCompanyInvoices = await Invoice.find({ companyId: cid });
    const pendingApprovals = allCompanyInvoices.filter(
      (inv) => inv.approvalStatus === 'PENDING_APPROVAL' || inv.approvalStatus === 'UNDER_REVIEW'
    ).length;

    const paidInvoices = allCompanyInvoices.filter((inv) => inv.paymentStatus === 'PAID').length;
    const unpaidInvoices = allCompanyInvoices.filter(
      (inv) => inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIALLY_PAID'
    ).length;
    const overdueInvoices = allCompanyInvoices.filter(
      (inv) => inv.paymentStatus === 'OVERDUE'
    ).length;

    // Helper to calculate percentage trend
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return roundToTwo(((current - previous) / previous) * 100);
    };

    return {
      kpis: {
        totalInvoices: {
          value: totalInvoicesCurrent,
          prevValue: totalInvoicesPrev,
          trend: calculateTrend(totalInvoicesCurrent, totalInvoicesPrev),
          trendDirection: totalInvoicesCurrent >= totalInvoicesPrev ? 'up' : 'down',
        },
        totalSpending: {
          value: totalSpendingCurrent,
          prevValue: totalSpendingPrev,
          trend: calculateTrend(totalSpendingCurrent, totalSpendingPrev),
          trendDirection: totalSpendingCurrent >= totalSpendingPrev ? 'up' : 'down',
        },
        pendingApprovals: {
          value: pendingApprovals,
          badge: pendingApprovals > 0 ? 'Requires attention' : 'All clear',
        },
        paidInvoices: {
          value: paidInvoices,
          total: allCompanyInvoices.length,
        },
        unpaidInvoices: {
          value: unpaidInvoices,
          total: allCompanyInvoices.length,
        },
        overdueInvoices: {
          value: overdueInvoices,
          alert: overdueInvoices > 0,
        },
      },
      period: {
        filterRange,
        startDate,
        endDate,
      },
    };
  }

  /**
   * Monthly Spending Trend using MongoDB aggregation
   */
  async getMonthlySpendingTrend(companyId, months = 12) {
    const cid = new mongoose.Types.ObjectId(companyId);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const pipeline = [
      {
        $match: {
          companyId: cid,
          invoiceDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
          },
          totalInvoiced: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ];

    const results = await Invoice.aggregate(pipeline);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return results.map((r) => ({
      month: `${monthNames[r._id.month - 1]} ${r._id.year}`,
      totalInvoiced: roundToTwo(r.totalInvoiced),
      totalPaid: roundToTwo(r.totalPaid),
      invoiceCount: r.invoiceCount,
    }));
  }

  /**
   * Spending Breakdown by Category
   */
  async getCategorySpending(companyId, filterRange = 'this_year') {
    const cid = new mongoose.Types.ObjectId(companyId);
    const { startDate, endDate } = getDateRange(filterRange);

    const pipeline = [
      {
        $match: {
          companyId: cid,
          invoiceDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ];

    const results = await Invoice.aggregate(pipeline);
    const totalAll = results.reduce((acc, curr) => acc + curr.totalAmount, 0) || 1;

    return results.map((r) => ({
      category: r._id || 'Other',
      totalAmount: roundToTwo(r.totalAmount),
      paidAmount: roundToTwo(r.paidAmount),
      count: r.count,
      percentage: roundToTwo((r.totalAmount / totalAll) * 100),
    }));
  }

  /**
   * Top 5 vendors by spending
   */
  async getTopVendors(companyId, limit = 5) {
    const cid = new mongoose.Types.ObjectId(companyId);
    const pipeline = [
      {
        $match: { companyId: cid },
      },
      {
        $group: {
          _id: '$vendorName',
          vendorId: { $first: '$vendorId' },
          totalSpent: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          outstanding: { $sum: '$remainingAmount' },
          invoiceCount: { $sum: 1 },
        },
      },
      {
        $sort: { totalSpent: -1 },
      },
      {
        $limit: limit,
      },
    ];

    const results = await Invoice.aggregate(pipeline);
    return results.map((r) => ({
      vendorName: r._id,
      vendorId: r.vendorId,
      totalSpent: roundToTwo(r.totalSpent),
      paidAmount: roundToTwo(r.paidAmount),
      outstanding: roundToTwo(r.outstanding),
      invoiceCount: r.invoiceCount,
    }));
  }

  /**
   * Invoice Status Distribution for Donut Chart
   */
  async getInvoiceStatusDistribution(companyId) {
    const cid = new mongoose.Types.ObjectId(companyId);
    const pipeline = [
      {
        $match: { companyId: cid },
      },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ];

    const results = await Invoice.aggregate(pipeline);
    return results.map((r) => ({
      status: r._id,
      count: r.count,
      totalAmount: roundToTwo(r.totalAmount),
    }));
  }

  /**
   * Upcoming Payments (invoices approaching due dates in next 30 days)
   */
  async getUpcomingPayments(companyId, limit = 6) {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const invoices = await Invoice.find({
      companyId,
      remainingAmount: { $gt: 0 },
      approvalStatus: { $in: ['APPROVED', 'PENDING_APPROVAL'] },
      dueDate: { $gte: now, $lte: nextMonth },
    })
      .sort({ dueDate: 1 })
      .limit(limit)
      .select('invoiceNumber vendorName dueDate remainingAmount totalAmount paymentStatus');

    return invoices;
  }

  /**
   * Spend Intelligence Comprehensive Analytics
   */
  async getSpendIntelligenceOverview(companyId, filterRange = '3m') {
    const cid = new mongoose.Types.ObjectId(companyId);
    const { startDate, endDate } = getDateRange(filterRange);

    const matchQuery = {
      companyId: cid,
      invoiceDate: { $gte: startDate, $lte: endDate },
    };

    // Overall metrics
    const overall = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalExpenditure: { $sum: '$totalAmount' },
          totalTax: { $sum: '$taxAmount' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
          avgInvoiceValue: { $avg: '$totalAmount' },
          cgstTotal: { $sum: '$cgst' },
          sgstTotal: { $sum: '$sgst' },
          igstTotal: { $sum: '$igst' },
        },
      },
    ]);

    const stats = overall[0] || {
      totalExpenditure: 0,
      totalTax: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      count: 0,
      avgInvoiceValue: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      igstTotal: 0,
    };

    // Category breakdown
    const categories = await this.getCategorySpending(companyId, filterRange);

    // Top vendors
    const topVendors = await this.getTopVendors(companyId, 5);

    // Vendor concentration (top 3 vendors share of total)
    const top3Spend = topVendors.slice(0, 3).reduce((acc, v) => acc + v.totalSpent, 0);
    const vendorConcentration = stats.totalExpenditure > 0 ? roundToTwo((top3Spend / stats.totalExpenditure) * 100) : 0;

    // Anomalies
    const anomalies = await this.detectSpendingAnomalies(companyId);

    // Dynamic AI Insights
    const insights = await this.generateFinancialInsights(companyId, stats, categories, topVendors, anomalies);

    return {
      overview: {
        totalExpenditure: roundToTwo(stats.totalExpenditure),
        totalTax: roundToTwo(stats.totalTax),
        totalPaid: roundToTwo(stats.totalPaid),
        totalOutstanding: roundToTwo(stats.totalOutstanding),
        invoiceCount: stats.count,
        avgInvoiceValue: roundToTwo(stats.avgInvoiceValue),
        vendorConcentration,
      },
      taxBreakdown: {
        totalGst: roundToTwo(stats.totalTax),
        cgst: roundToTwo(stats.cgstTotal),
        sgst: roundToTwo(stats.sgstTotal),
        igst: roundToTwo(stats.igstTotal),
      },
      categories,
      topVendors,
      anomalies,
      insights,
    };
  }

  /**
   * Rule-based Anomaly Detection
   */
  async detectSpendingAnomalies(companyId) {
    const anomalies = [];
    const cid = new mongoose.Types.ObjectId(companyId);

    // 1. Invoices significantly higher than vendor's average (> 1.8x average)
    const vendorAverages = await Invoice.aggregate([
      { $match: { companyId: cid } },
      {
        $group: {
          _id: '$vendorName',
          avgAmount: { $avg: '$totalAmount' },
          count: { $sum: 1 },
          maxInvoice: { $max: '$totalAmount' },
        },
      },
      {
        $match: { count: { $gte: 2 } },
      },
    ]);

    for (const v of vendorAverages) {
      const spikeInvoices = await Invoice.find({
        companyId: cid,
        vendorName: v._id,
        totalAmount: { $gt: v.avgAmount * 1.8 },
      })
        .sort({ invoiceDate: -1 })
        .limit(2);

      spikeInvoices.forEach((inv) => {
        anomalies.push({
          type: 'VENDOR_SPIKE',
          severity: 'medium',
          title: `Unusual Spike for ${v._id}`,
          message: `Invoice #${inv.invoiceNumber} for ₹${inv.totalAmount} is ${(inv.totalAmount / v.avgAmount).toFixed(1)}x greater than this vendor's historical average of ₹${roundToTwo(v.avgAmount)}.`,
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.invoiceDate,
        });
      });
    }

    // 2. High Category Concentration
    const categoryTotals = await this.getCategorySpending(companyId, '3m');
    categoryTotals.forEach((cat) => {
      if (cat.percentage > 50) {
        anomalies.push({
          type: 'HIGH_CATEGORY_CONCENTRATION',
          severity: 'low',
          title: `High Spending in ${cat.category}`,
          message: `${cat.category} accounts for ${cat.percentage}% of company expenditure in the recent quarter.`,
        });
      }
    });

    // 3. Duplicate Warnings flagged
    const duplicateInvoices = await Invoice.find({
      companyId: cid,
      isDuplicateWarning: true,
    })
      .limit(3)
      .select('invoiceNumber vendorName totalAmount duplicateReason');

    duplicateInvoices.forEach((dup) => {
      anomalies.push({
        type: 'DUPLICATE_PATTERN',
        severity: 'high',
        title: `Duplicate Pattern: Invoice #${dup.invoiceNumber}`,
        message: dup.duplicateReason || `Suspected duplicate pattern detected for ${dup.vendorName} (₹${dup.totalAmount}).`,
        invoiceId: dup._id,
      });
    });

    return anomalies;
  }

  /**
   * Rule-based dynamic financial insights engine
   */
  async generateFinancialInsights(companyId, stats, categories, topVendors, anomalies) {
    const insights = [];

    // Category dominance insight
    if (categories.length > 0) {
      const topCategory = categories[0];
      insights.push({
        id: 'cat-dom',
        icon: 'PieChart',
        type: 'category',
        text: `${topCategory.category} is currently your largest expenditure category, representing ${topCategory.percentage}% of all corporate spend (₹${roundToTwo(topCategory.totalAmount)}).`,
      });
    }

    // Top vendor insight
    if (topVendors.length > 0) {
      const topVendor = topVendors[0];
      insights.push({
        id: 'top-vendor',
        icon: 'Building2',
        type: 'vendor',
        text: `${topVendor.vendorName} leads your supplier payables with ₹${roundToTwo(topVendor.totalSpent)} across ${topVendor.invoiceCount} invoices.`,
      });
    }

    // Overdue liability insight
    const overdueCount = await Invoice.countDocuments({
      companyId,
      paymentStatus: 'OVERDUE',
    });
    if (overdueCount > 0) {
      insights.push({
        id: 'overdue-alert',
        icon: 'AlertTriangle',
        type: 'warning',
        text: `There are ${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''} requiring immediate settlement to avoid supplier penalties and credit holds.`,
      });
    } else {
      insights.push({
        id: 'overdue-good',
        icon: 'CheckCircle2',
        type: 'positive',
        text: `Excellent payment discipline: zero overdue invoices detected across all verified vendor accounts.`,
      });
    }

    // Tax input credit insight
    if (stats.totalTax > 0) {
      insights.push({
        id: 'gst-itc',
        icon: 'Receipt',
        type: 'tax',
        text: `Total Input Tax Credit (ITC) potential under GST is ₹${roundToTwo(stats.totalTax)} (CGST: ₹${roundToTwo(stats.cgstTotal)}, SGST: ₹${roundToTwo(stats.sgstTotal)}, IGST: ₹${roundToTwo(stats.igstTotal)}).`,
      });
    }

    // Anomaly count insight
    if (anomalies.length > 0) {
      insights.push({
        id: 'anomaly-alert',
        icon: 'ShieldAlert',
        type: 'anomaly',
        text: `${anomalies.length} spending anomal${anomalies.length > 1 ? 'ies' : 'y'} detected by automated rules for audit review.`,
      });
    }

    return insights;
  }
}

module.exports = new AnalyticsService();
