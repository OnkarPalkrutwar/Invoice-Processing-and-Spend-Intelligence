import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  Building2,
  Receipt,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Info,
  Filter,
  RefreshCw,
  ArrowUpRight,
  Layers,
  FileCheck2,
  ShieldCheck,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { formatINR } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';
import { CategoryChart } from '../components/dashboard/CategoryChart';
import { VendorChart } from '../components/dashboard/VendorChart';

export const SpendAnalytics = () => {
  const [period, setPeriod] = useState('3m');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchSpendIntelligence = async (selectedPeriod = period) => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getSpendIntelligenceOverview(selectedPeriod);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load spend intelligence:', err);
      setError(err.response?.data?.message || 'Failed to load spend intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpendIntelligence(period);
  }, [period]);

  if (loading && !data) {
    return <LoadingSpinner label="Compiling spend intelligence and audit indicators..." size="lg" />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => fetchSpendIntelligence(period)} />;
  }

  const { overview, taxBreakdown, categories, topVendors, anomalies, insights } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Spend Intelligence & Tax Analytics
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Audit Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Variance analysis, GSTR-2B Input Tax Credit reconciliation, and supplier concentration metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-xs font-medium focus:ring-0 cursor-pointer pr-1 py-0 outline-none"
            >
              <option value="30d">Past 30 Days</option>
              <option value="3m">Past Quarter (3M)</option>
              <option value="6m">Past 6 Months</option>
              <option value="this_year">This Fiscal Year</option>
            </select>
          </div>

          <button
            onClick={() => fetchSpendIntelligence(period)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Executive Financial Highlights Panel (Professional, clean card) */}
      {insights && insights.length > 0 && (
        <div className="card p-5 border-l-4 border-l-zinc-900">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-900" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Executive Spend Highlights & Variances
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Automated Audit Summary</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((ins, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 hover:bg-slate-50 transition-colors"
              >
                <p className="text-xs leading-relaxed text-slate-700">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Cumulative Expenditure
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 block tabular-nums">
            {formatINR(overview?.totalExpenditure)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {overview?.invoiceCount || 0} registered invoices
          </span>
        </div>

        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Average Invoice Size
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 block tabular-nums">
            {formatINR(overview?.avgInvoiceValue)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Typical billing ticket value</span>
        </div>

        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Supplier Concentration
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1.5 block tabular-nums">
            {overview?.vendorConcentration}%
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cumulative share of top 3 suppliers
          </span>
        </div>

        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            GST Input Credit (ITC)
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-700 mt-1.5 block tabular-nums">
            {formatINR(overview?.totalTax)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Claimable tax under GST rules</span>
        </div>
      </div>

      {/* Tax & GST Analytics Section */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">GSTR-2B Input Tax Credit (ITC) Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reconciled tax distribution across Indian GST statutory classifications
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
            Eligible for ITC Offset
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total GST Incurred</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatINR(taxBreakdown?.totalGst)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">CGST (Central)</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatINR(taxBreakdown?.cgst)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">SGST (State)</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatINR(taxBreakdown?.sgst)}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-white border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">IGST (Inter-State)</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-1 block tabular-nums">
              {formatINR(taxBreakdown?.igst)}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row: Category Distribution & Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Category Allocation & Run-Rate</h3>
              <p className="text-xs text-slate-500 mt-0.5">Corporate procurement distribution by department</p>
            </div>
          </div>
          <CategoryChart data={categories} />
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Supplier Concentration Curve</h3>
              <p className="text-xs text-slate-500 mt-0.5">Primary suppliers ranked by invoiced spend</p>
            </div>
          </div>
          <VendorChart data={topVendors} />
        </div>
      </div>

      {/* Spending Anomaly & Risk Alerts Panel */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Audit Exceptions & Variance Warnings</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Heuristic rules flagging historical price spikes, supplier duplicates, and concentration risks
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {anomalies?.length || 0} Flags
          </span>
        </div>

        {anomalies?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-slate-600 font-medium">No variance alerts detected for this audit cycle.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {anomalies.map((anom, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start gap-3.5 text-xs">
                <div
                  className={`p-1.5 rounded-md mt-0.5 border flex-shrink-0 ${
                    anom.severity === 'high'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : anom.severity === 'medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{anom.title}</span>
                    <span
                      className={`text-[9px] font-mono font-semibold uppercase px-1.5 py-0.2 rounded border ${
                        anom.severity === 'high'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {anom.severity} priority
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">{anom.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
