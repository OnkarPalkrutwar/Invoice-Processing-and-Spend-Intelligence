import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Eye,
  Edit,
  Trash2,
  FileText,
  AlertTriangle,
  Download,
  X,
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { formatINR, formatDate } from '../utils/formatters';
import { ApprovalStatusBadge, PaymentStatusBadge } from '../components/common/InvoiceStatusBadge';
import { Pagination } from '../components/common/Pagination';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

export const InvoiceList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasRole } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [approvalStatus, setApprovalStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Quick Tab View Preset
  const [activeTab, setActiveTab] = useState('ALL');

  // Delete modal state
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    setActionError('');
    try {
      const params = {
        search: search.trim() || undefined,
        approvalStatus: approvalStatus !== 'ALL' ? approvalStatus : undefined,
        paymentStatus: paymentStatus !== 'ALL' ? paymentStatus : undefined,
        category: category !== 'ALL' ? category : undefined,
        sortBy,
        sortOrder,
        page,
        limit: 10,
      };

      const res = await invoiceService.getInvoices(params);
      if (res.success) {
        setInvoices(res.data || []);
        setTotal(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, approvalStatus, paymentStatus, category, sortBy, sortOrder, page]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    if (tab === 'ALL') {
      setApprovalStatus('ALL');
      setPaymentStatus('ALL');
    } else if (tab === 'NEEDS_APPROVAL') {
      setApprovalStatus('PENDING_APPROVAL');
      setPaymentStatus('ALL');
    } else if (tab === 'OVERDUE') {
      setApprovalStatus('ALL');
      setPaymentStatus('OVERDUE');
    } else if (tab === 'APPROVED') {
      setApprovalStatus('APPROVED');
      setPaymentStatus('ALL');
    } else if (tab === 'PAID') {
      setApprovalStatus('ALL');
      setPaymentStatus('PAID');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    setIsDeleting(true);
    setActionError('');

    try {
      const res = await invoiceService.deleteInvoice(invoiceToDelete._id);
      if (res.success) {
        setInvoiceToDelete(null);
        fetchInvoices();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete invoice.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoice Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit, verify, and monitor accounts payable and corporate liability schedules
          </p>
        </div>

        <Link to="/upload" className="btn-primary text-xs py-1.5 px-3.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Invoice</span>
        </Link>
      </div>

      {/* Status Segmented Tabs (Linear / Stripe style) */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'ALL', label: 'All Invoices' },
          { id: 'NEEDS_APPROVAL', label: 'Pending Approval' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'OVERDUE', label: 'Overdue Bills' },
          { id: 'PAID', label: 'Settled Paid' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-zinc-900 text-zinc-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar Card */}
      <div className="card p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice # or supplier..."
              className="input-field pl-8 pr-8 py-1.5 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">All Categories</option>
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

          {/* Approval Filter */}
          <div>
            <select
              value={approvalStatus}
              onChange={(e) => {
                setApprovalStatus(e.target.value);
                setActiveTab('CUSTOM');
                setPage(1);
              }}
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">All Approvals</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="UPLOADED">Uploaded</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setActiveTab('CUSTOM');
                setPage(1);
              }}
              className="input-field py-1.5 text-xs"
            >
              <option value="ALL">All Payments</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Table Card */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading accounts payable ledger..." />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Invoices Found"
            description="No ledger records match the selected filter criteria."
            actionLabel="Reset All Filters"
            onAction={() => {
              setSearch('');
              setApprovalStatus('ALL');
              setPaymentStatus('ALL');
              setCategory('ALL');
              setActiveTab('ALL');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('invoiceNumber')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Invoice #</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                    onClick={() => handleSort('invoiceDate')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none text-right"
                    onClick={() => handleSort('totalAmount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Amount</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4">Approval</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
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
                    <td className="py-2.5 px-4 text-slate-700 font-medium truncate max-w-[170px] text-xs">
                      {inv.vendorName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                      <span className="px-1.5 py-0.5 text-[11px] bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {inv.category}
                      </span>
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
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/invoices/${inv._id}/edit`}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        {hasRole('ADMIN', 'FINANCE_MANAGER') && (
                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={10}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        title="Confirm Invoice Deletion"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-rose-50 rounded-lg text-rose-800 text-xs border border-rose-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Permanent deletion</p>
              <p className="mt-0.5">
                This will delete invoice #{invoiceToDelete?.invoiceNumber} ({invoiceToDelete?.vendorName}) and all associated approval and payment audit logs.
              </p>
            </div>
          </div>

          {actionError && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded border border-rose-200">
              {actionError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setInvoiceToDelete(null)}
              disabled={isDeleting}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="btn-danger text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Delete Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
