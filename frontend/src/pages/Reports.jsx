import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  FileText,
  FileCheck,
  Calendar,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { reportService } from '../services/reportService';
import { vendorService } from '../services/vendorService';
import { formatINR, formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Reports = () => {
  const [reportType, setReportType] = useState('summary');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vendorId: '',
    category: '',
    approvalStatus: '',
    paymentStatus: '',
  });

  const [vendors, setVendors] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchVendorsList = async () => {
      try {
        const res = await vendorService.getVendors({ limit: 100 });
        if (res.success && res.data) setVendors(res.data);
      } catch (e) {
        // Silently skip
      }
    };
    fetchVendorsList();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const activeFilters = { ...filters };
      if (reportType === 'overdue') activeFilters.paymentStatus = 'OVERDUE';
      if (reportType === 'outstanding') activeFilters.paymentStatus = 'UNPAID';

      const res = await reportService.getInvoicesReport(activeFilters);
      if (res.success && res.data) {
        setReportData(res.data);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, filters]);

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const activeFilters = { ...filters };
      if (reportType === 'overdue') activeFilters.paymentStatus = 'OVERDUE';
      if (reportType === 'outstanding') activeFilters.paymentStatus = 'UNPAID';

      if (format === 'csv') await reportService.downloadCsv(activeFilters);
      if (format === 'excel') await reportService.downloadExcel(activeFilters);
      if (format === 'pdf') await reportService.downloadPdf(activeFilters);
    } catch (err) {
      alert('Failed to generate export file: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const totals = reportData?.totals;
  const invoices = reportData?.invoices || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit & Financial Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Download certified audit exports and financial schedules in PDF, Excel, and CSV formats
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF Export</span>
          </button>

          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV Dataset</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'summary', label: 'Invoice Summary Ledger' },
          { id: 'outstanding', label: 'Outstanding Liabilities' },
          { id: 'overdue', label: 'Overdue Aging Schedule' },
          { id: 'gst', label: 'GSTR-2B Tax Credit Summary' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setReportType(t.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              reportType === t.id
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Options Bar */}
      <div className="card p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="input-field py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="input-field py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Supplier Filter
            </label>
            <select
              value={filters.vendorId}
              onChange={(e) => setFilters({ ...filters, vendorId: e.target.value })}
              className="input-field py-1.5 text-xs"
            >
              <option value="">All Registered Suppliers</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Department Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="input-field py-1.5 text-xs"
            >
              <option value="">All Categories</option>
              <option value="Software">Software</option>
              <option value="Office Supplies">Office Supplies</option>
              <option value="Hardware">Hardware</option>
              <option value="Travel">Travel</option>
              <option value="Utilities">Utilities</option>
              <option value="Marketing">Marketing</option>
              <option value="Services">Services</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="card p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Report Invoices</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">{totals.count}</span>
          </div>

          <div className="card p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Invoiced</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatINR(totals.totalAmount)}
            </span>
          </div>

          <div className="card p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Settled</span>
            <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block tabular-nums">
              {formatINR(totals.paidAmount)}
            </span>
          </div>

          <div className="card p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Outstanding Balance</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatINR(totals.remainingAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Detailed Report Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Compiling report dataset..." />
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices found for the specified report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Taxable</th>
                  <th className="py-2.5 px-4 text-right">GST Tax</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4 text-right">Settled</th>
                  <th className="py-2.5 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 font-medium truncate max-w-[150px]">
                      {inv.vendorName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600 whitespace-nowrap">
                      {inv.category}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 text-right whitespace-nowrap tabular-nums">
                      {formatINR(inv.subtotal)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 text-right whitespace-nowrap tabular-nums">
                      {formatINR(inv.taxAmount)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right whitespace-nowrap tabular-nums">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-emerald-700 text-right whitespace-nowrap tabular-nums">
                      {formatINR(inv.paidAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-900 font-semibold text-right whitespace-nowrap tabular-nums">
                      {formatINR(inv.remainingAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
