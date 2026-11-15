import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  IndianRupee,
  Calendar,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { vendorService } from '../services/vendorService';
import { formatINR, formatDate } from '../utils/formatters';
import { ApprovalStatusBadge, PaymentStatusBadge } from '../components/common/InvoiceStatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';

export const VendorDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVendor = async () => {
    setLoading(true);
    try {
      const res = await vendorService.getVendorById(id);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Vendor not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor();
  }, [id]);

  if (loading) return <LoadingSpinner label="Loading supplier record..." />;
  if (error || !data) return <ErrorState message={error} onRetry={fetchVendor} />;

  const { vendor, recentInvoices, chartData } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-1">
        <Link
          to="/vendors"
          className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{vendor.name}</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {vendor.category}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">GSTIN: {vendor.gstin || 'Unregistered'}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Cumulative Invoices
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {vendor.totalInvoices || 0}
          </span>
        </div>

        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Lifetime Procurement Spend
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {formatINR(vendor.totalSpent)}
          </span>
        </div>

        <div className="card p-4">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Current Outstanding Balance
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block tabular-nums">
            {formatINR(vendor.totalOutstanding)}
          </span>
        </div>
      </div>

      {/* Details & Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact Info Card */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            Supplier Contact Details
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Billing Email</span>
                <span className="text-slate-800">{vendor.email || '—'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Phone</span>
                <span className="text-slate-800 font-mono">{vendor.phone || '—'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Registered Office</span>
                <span className="text-slate-700 leading-relaxed">{vendor.address || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Spend Trend */}
        <div className="card lg:col-span-2 p-5">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider pb-2 mb-3 border-b border-slate-100">
            Monthly Spend Run-Rate
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 rounded-lg shadow-dropdown border border-slate-200 text-xs">
                          <span className="text-slate-500">{payload[0]?.payload?.month}: </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatINR(payload[0]?.value)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" fill="#18181b" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Supplier Invoices History */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Invoices Recorded with {vendor.name}
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            {recentInvoices?.length || 0} total records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Issue Date</th>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Approval</th>
                <th className="py-2.5 px-4">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices?.map((inv) => (
                <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-medium text-xs text-slate-900 whitespace-nowrap">
                    <Link
                      to={`/invoices/${inv._id}`}
                      className="hover:text-zinc-950 font-semibold inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inv.invoiceNumber}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(inv.invoiceDate)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-xs text-slate-900 text-right whitespace-nowrap tabular-nums">
                    {formatINR(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <ApprovalStatusBadge status={inv.approvalStatus} />
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <PaymentStatusBadge status={inv.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
