import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Receipt,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UploadCloud,
  Filter,
  RefreshCw,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { formatINR } from '../utils/formatters';
import { StatCard } from '../components/dashboard/StatCard';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { CategoryChart } from '../components/dashboard/CategoryChart';
import { VendorChart } from '../components/dashboard/VendorChart';
import { RecentInvoices } from '../components/dashboard/RecentInvoices';
import { UpcomingPayments } from '../components/dashboard/UpcomingPayments';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';

export const Dashboard = () => {
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard Data State
  const [summaryData, setSummaryData] = useState(null);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [categorySpending, setCategorySpending] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);

  const loadDashboardData = async (selectedPeriod = period) => {
    setLoading(true);
    setError(null);

    try {
      const [
        summaryRes,
        trendRes,
        categoryRes,
        vendorsRes,
        recentRes,
        upcomingRes,
      ] = await Promise.all([
        analyticsService.getDashboardSummary(selectedPeriod),
        analyticsService.getMonthlySpending(12),
        analyticsService.getCategorySpending(selectedPeriod === '30d' ? '30d' : selectedPeriod),
        analyticsService.getVendorSpending(),
        analyticsService.getRecentInvoices(6),
        analyticsService.getUpcomingPayments(),
      ]);

      if (summaryRes.success) setSummaryData(summaryRes.data);
      if (trendRes.success) setSpendingTrend(trendRes.data || []);
      if (categoryRes.success) setCategorySpending(categoryRes.data || []);
      if (vendorsRes.success) setTopVendors(vendorsRes.data || []);
      if (recentRes.success) setRecentInvoices(recentRes.data || []);
      if (upcomingRes.success) setUpcomingPayments(upcomingRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(period);
  }, [period]);

  const kpis = summaryData?.kpis;

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accounts Payable Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time invoice processing pipeline and corporate expenditure summary
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Filter Dropdown */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-xs font-medium focus:ring-0 cursor-pointer pr-1 py-0 outline-none"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last Quarter (3M)</option>
              <option value="6m">Last 6 Months</option>
              <option value="this_year">This Fiscal Year</option>
            </select>
          </div>

          <button
            onClick={() => loadDashboardData(period)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link to="/upload" className="btn-primary text-xs py-1.5 px-3">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Invoice</span>
          </Link>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => loadDashboardData(period)} />}

      {loading && !summaryData ? (
        <LoadingSpinner label="Loading financial indicators..." size="lg" />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            <StatCard
              title="Total Invoices"
              value={kpis?.totalInvoices?.value ?? 0}
              trend={kpis?.totalInvoices?.trend}
              trendDirection={kpis?.totalInvoices?.trendDirection}
              icon={Receipt}
            />
            <StatCard
              title="Total Spending"
              value={formatINR(kpis?.totalSpending?.value ?? 0)}
              trend={kpis?.totalSpending?.trend}
              trendDirection={kpis?.totalSpending?.trendDirection}
              icon={IndianRupee}
            />
            <StatCard
              title="Pending Approval"
              value={kpis?.pendingApprovals?.value ?? 0}
              badge={kpis?.pendingApprovals?.badge}
              icon={Clock}
              alert={kpis?.pendingApprovals?.value > 0}
            />
            <StatCard
              title="Settled Paid"
              value={kpis?.paidInvoices?.value ?? 0}
              subtitle={`of ${kpis?.paidInvoices?.total ?? 0} total bills`}
              icon={CheckCircle2}
            />
            <StatCard
              title="Active Liabilities"
              value={kpis?.unpaidInvoices?.value ?? 0}
              subtitle="Unpaid / partial"
              icon={AlertCircle}
            />
            <StatCard
              title="Overdue Invoices"
              value={kpis?.overdueInvoices?.value ?? 0}
              alert={kpis?.overdueInvoices?.alert}
              subtitle={kpis?.overdueInvoices?.value > 0 ? 'Requires attention' : 'On schedule'}
              icon={AlertTriangle}
            />
          </div>

          {/* Charts Row 1: Monthly Trend & Category Share */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card lg:col-span-2">
              <div className="card-header">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Monthly Spending & Settlement Run-Rate</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Invoiced procurement volume vs settled payments</p>
                </div>
                <Link
                  to="/spend-intelligence"
                  className="text-xs font-medium text-slate-600 hover:text-zinc-950 inline-flex items-center gap-1 transition-colors"
                >
                  Spend Intelligence <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <SpendingChart data={spendingTrend} />
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Department Allocation</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Share of corporate procurement</p>
                </div>
              </div>
              <CategoryChart data={categorySpending} />
            </div>
          </div>

          {/* Charts Row 2: Top Vendors & Upcoming Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card lg:col-span-2">
              <div className="card-header">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Top Suppliers by Procurement Volume</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Accounts with highest historical expenditure</p>
                </div>
                <Link to="/vendors" className="text-xs font-medium text-slate-600 hover:text-zinc-950 inline-flex items-center gap-1 transition-colors">
                  Vendor Directory <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <VendorChart data={topVendors} />
            </div>

            <div className="card flex flex-col">
              <div className="card-header">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Upcoming Due Dates</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Invoices with due dates in next 30 days</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <UpcomingPayments payments={upcomingPayments} />
              </div>
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Invoices</h3>
                <p className="text-xs text-slate-500 mt-0.5">Latest documents logged in accounts payable ledger</p>
              </div>
              <Link to="/invoices" className="text-xs font-medium text-slate-600 hover:text-zinc-950 inline-flex items-center gap-1 transition-colors">
                View All Invoices <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <RecentInvoices invoices={recentInvoices} />
          </div>
        </>
      )}
    </div>
  );
};
