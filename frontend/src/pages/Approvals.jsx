import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';
import { approvalService } from '../services/approvalService';
import { formatINR, formatDate } from '../utils/formatters';
import { ApprovalStatusBadge } from '../components/common/InvoiceStatusBadge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';

export const Approvals = () => {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Approval / Rejection action states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'REJECT'
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await approvalService.getPendingApprovals();
      if (res.success) {
        setInvoices(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleOpenModal = (inv, type) => {
    setSelectedInvoice(inv);
    setActionType(type);
    setComment(type === 'APPROVE' ? 'Approved after verification.' : '');
    setActionError('');
  };

  const handleConfirmAction = async () => {
    if (!selectedInvoice) return;

    if (actionType === 'REJECT' && !comment.trim()) {
      setActionError('A rejection explanation is mandatory.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      if (actionType === 'APPROVE') {
        await approvalService.approveInvoice(selectedInvoice._id, comment);
      } else {
        await approvalService.rejectInvoice(selectedInvoice._id, comment);
      }

      setSelectedInvoice(null);
      setActionType(null);
      fetchApprovals();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Operation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manager Approval Queue</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
              {invoices.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit and verify incoming vendor invoices pending manager sign-off
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter queue by invoice or vendor..."
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
      </div>

      {/* Main Approval Table Card */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading pending approvals queue..." />
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="All Clear — No Pending Approvals"
            description="There are currently no invoices awaiting your managerial review or verification."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Submitted By</th>
                  <th className="py-2.5 px-4">Invoice Date</th>
                  <th className="py-2.5 px-4 text-right">Total Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
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
                    <td className="py-2.5 px-4 text-slate-700 font-medium text-xs truncate max-w-[180px]">
                      {inv.vendorName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {inv.submittedBy?.name || 'Employee'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-xs text-slate-900 text-right whitespace-nowrap tabular-nums">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <ApprovalStatusBadge status={inv.approvalStatus} />
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="btn-secondary text-xs py-1 px-2.5"
                          title="Audit Details"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Audit</span>
                        </Link>

                        {hasRole('ADMIN', 'FINANCE_MANAGER') && (
                          <>
                            <button
                              onClick={() => handleOpenModal(inv, 'APPROVE')}
                              className="btn-success text-xs py-1 px-2.5"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => handleOpenModal(inv, 'REJECT')}
                              className="btn-danger text-xs py-1 px-2.5"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={actionType === 'APPROVE' ? 'Approve Invoice' : 'Reject Invoice'}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            {actionType === 'APPROVE' ? (
              <>
                Confirm approval for invoice{' '}
                <span className="font-mono font-semibold text-slate-900">#{selectedInvoice?.invoiceNumber}</span> from{' '}
                <span className="font-semibold text-slate-900">{selectedInvoice?.vendorName}</span> for{' '}
                <span className="font-mono font-bold text-slate-900">{formatINR(selectedInvoice?.totalAmount)}</span>.
              </>
            ) : (
              <>
                Please provide an audit explanation for rejecting invoice{' '}
                <span className="font-mono font-semibold text-slate-900">#{selectedInvoice?.invoiceNumber}</span>.
              </>
            )}
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              {actionType === 'APPROVE' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={
                actionType === 'APPROVE'
                  ? 'Verified statement of work and delivery...'
                  : 'State specific reasons for rejection...'
              }
              className="input-field text-xs"
              required={actionType === 'REJECT'}
            />
          </div>

          {actionError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{actionError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              disabled={actionLoading}
              className={actionType === 'APPROVE' ? 'btn-success text-xs' : 'btn-danger text-xs'}
            >
              {actionLoading
                ? 'Processing...'
                : actionType === 'APPROVE'
                ? 'Confirm Approval'
                : 'Reject Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
