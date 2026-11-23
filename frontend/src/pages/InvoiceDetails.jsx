import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  CreditCard,
  Download,
  Edit,
  ArrowLeft,
  AlertTriangle,
  History,
  Clock,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { invoiceService } from '../services/invoiceService';
import { approvalService } from '../services/approvalService';
import { paymentService } from '../services/paymentService';
import { formatINR, formatDate } from '../utils/formatters';
import { ApprovalStatusBadge, PaymentStatusBadge } from '../components/common/InvoiceStatusBadge';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/ErrorState';
import { useAuth } from '../context/AuthContext';

export const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  // Modals state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Action forms
  const [approvalComment, setApprovalComment] = useState('Approved after verification.');
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'NEFT',
    transactionReference: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invoiceService.getInvoiceById(id);
      if (res.success && res.data) {
        setInvoiceData(res.data);
        if (res.data.invoice) {
          setPaymentForm((prev) => ({
            ...prev,
            amount: res.data.invoice.remainingAmount || res.data.invoice.totalAmount,
          }));
        }
      } else {
        setError('Invoice could not be loaded.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invoice not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const res = await approvalService.approveInvoice(id, approvalComment);
      if (res.success) {
        setShowApproveModal(false);
        fetchInvoice();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to approve invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setActionError('A rejection reason is mandatory.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const res = await approvalService.rejectInvoice(id, rejectionReason);
      if (res.success) {
        setShowRejectModal(false);
        fetchInvoice();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');

    try {
      const payload = {
        invoiceId: id,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        transactionReference: paymentForm.transactionReference,
        notes: paymentForm.notes,
        paymentDate: paymentForm.paymentDate,
      };

      const res = await paymentService.recordPayment(payload);
      if (res.success) {
        setShowPaymentModal(false);
        fetchInvoice();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading invoice audit profile..." size="lg" />;
  if (error || !invoiceData) return <ErrorState message={error} onRetry={fetchInvoice} />;

  const { invoice, lineItems, activityLogs, approvals, payments } = invoiceData;
  const rawDocumentUrl = invoice.originalDocumentUrl || '/uploads/sample_aws_invoice.pdf';
  const isDocumentPdf = rawDocumentUrl?.toLowerCase().includes('.pdf');
  const documentFullUrl = rawDocumentUrl;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <Link
            to="/invoices"
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                #{invoice.invoiceNumber}
              </h1>
              <ApprovalStatusBadge status={invoice.approvalStatus} />
              <PaymentStatusBadge status={invoice.paymentStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued by <span className="font-medium text-slate-700">{invoice.vendorName}</span> on {formatDate(invoice.invoiceDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/invoices/${invoice._id}/edit`} className="btn-secondary text-xs py-1.5 px-3">
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Fields</span>
          </Link>

          {/* Manager Approval Actions */}
          {hasRole('ADMIN', 'FINANCE_MANAGER') && invoice.approvalStatus !== 'APPROVED' && (
            <>
              <button
                onClick={() => {
                  setActionError('');
                  setShowApproveModal(true);
                }}
                className="btn-success text-xs py-1.5 px-3"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve</span>
              </button>

              <button
                onClick={() => {
                  setActionError('');
                  setShowRejectModal(true);
                }}
                className="btn-danger text-xs py-1.5 px-3"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}

          {/* Payment Recording */}
          {hasRole('ADMIN', 'FINANCE_MANAGER') &&
            invoice.approvalStatus === 'APPROVED' &&
            invoice.remainingAmount > 0 && (
              <button
                onClick={() => {
                  setActionError('');
                  setShowPaymentModal(true);
                }}
                className="btn-primary text-xs py-1.5 px-3"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

          {documentFullUrl && (
            <a
              href={documentFullUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="btn-secondary text-xs py-1.5 px-2.5"
              title="Download Original Document"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Duplicate / Validation Alerts */}
      {invoice.isDuplicateWarning && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-700 mt-0.5" />
          <div>
            <p className="font-bold">Duplicate Invoicing Warning</p>
            <p className="mt-0.5 text-amber-800">{invoice.duplicateReason}</p>
          </div>
        </div>
      )}

      {invoice.rejectionReason && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
          <XCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-bold">Manager Rejection Notice</p>
            <p className="mt-0.5">{invoice.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Left Document Preview & Right Financial Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Document Preview Pane (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="card p-4 flex flex-col h-[650px]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-600" />
                Document Attachment
              </span>
              {documentFullUrl && (
                <a
                  href={documentFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-600 hover:text-zinc-950 font-medium inline-flex items-center gap-1"
                >
                  Open In Tab <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex-1 bg-slate-50 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center relative">
              {documentFullUrl ? (
                isDocumentPdf ? (
                  <object
                    data={`${documentFullUrl}#toolbar=0`}
                    type="application/pdf"
                    className="w-full h-full border-none"
                  >
                    <iframe
                      src={`${documentFullUrl}#toolbar=0`}
                      title="Invoice PDF Preview"
                      className="w-full h-full border-none"
                    >
                      <div className="p-6 text-center text-slate-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs mb-3">PDF inline display is restricted by browser settings.</p>
                        <a
                          href={documentFullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Document in Tab
                        </a>
                      </div>
                    </iframe>
                  </object>
                ) : (
                  <img
                    src={documentFullUrl}
                    alt="Invoice Document Preview"
                    className="max-h-full max-w-full object-contain p-2"
                  />
                )
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No file preview available for this record.</p>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Information Card */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              Vendor Entity Profile
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Vendor Name:</span>
                <span className="font-semibold text-slate-900">{invoice.vendorName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">GSTIN:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {invoice.vendorId?.gstin || 'Unspecified'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-700">{invoice.vendorId?.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Phone:</span>
                <span className="text-slate-700">{invoice.vendorId?.phone || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Details Pane (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Key Financial Breakdown Card */}
          <div className="card space-y-4 p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Total Amount</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block tabular-nums">
                  {formatINR(invoice.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Amount Settled</span>
                <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block tabular-nums">
                  {formatINR(invoice.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Outstanding</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block tabular-nums">
                  {formatINR(invoice.remainingAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Payment Due</span>
                <span className="text-xs font-semibold text-slate-800 mt-1 block">
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Itemized Line Breakdown
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center w-16">Qty</th>
                      <th className="py-2.5 px-3 text-right w-24">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-4 text-center text-slate-400">
                          Single item billed as per invoice summary
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item) => (
                        <tr key={item._id}>
                          <td className="py-2 px-3 font-medium text-slate-800">{item.description}</td>
                          <td className="py-2 px-3 text-center text-slate-600 font-mono">{item.quantity}</td>
                          <td className="py-2 px-3 text-right text-slate-600 font-mono tabular-nums">
                            {formatINR(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold font-mono text-slate-900 tabular-nums">
                            {formatINR(item.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tax & GST Computation Table */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs space-y-1.5 max-w-sm ml-auto font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans">Taxable Subtotal:</span>
                <span className="font-semibold text-slate-800 tabular-nums">{formatINR(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="font-sans">Discount:</span>
                  <span className="tabular-nums">- {formatINR(invoice.discount)}</span>
                </div>
              )}
              {invoice.igst > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">IGST (Inter-state):</span>
                  <span className="text-slate-800 tabular-nums">{formatINR(invoice.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">CGST (Central):</span>
                    <span className="text-slate-800 tabular-nums">{formatINR(invoice.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">SGST (State):</span>
                    <span className="text-slate-800 tabular-nums">{formatINR(invoice.sgst)}</span>
                  </div>
                </>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span className="font-sans">Invoice Total:</span>
                <span className="tabular-nums">{formatINR(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Payment History Records */}
          <div className="card p-4">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Payment Settlement Ledger
            </h4>
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No payment transactions recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold font-mono text-slate-900 tabular-nums">
                        {formatINR(p.amount)} via {p.paymentMethod}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Ref: <span className="font-mono">{p.transactionReference || 'N/A'}</span> • {formatDate(p.paymentDate)} • By{' '}
                        {p.recordedBy?.name || 'Manager'}
                      </p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Settled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity & Audit Trail Timeline */}
          <div className="card p-4">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" />
              Audit Log & Lifecycle History
            </h4>

            <div className="relative pl-5 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
              {activityLogs.map((log) => (
                <div key={log._id} className="relative">
                  <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-zinc-900 border border-white" />
                  <p className="text-xs font-semibold text-slate-800">
                    {log.action.replace('_', ' ')}{' '}
                    <span className="text-slate-400 font-normal">by {log.userName}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Invoice">
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Confirm approval of invoice <span className="font-mono font-semibold">#{invoice.invoiceNumber}</span> for{' '}
            <span className="font-mono font-bold text-slate-900">{formatINR(invoice.totalAmount)}</span> from{' '}
            <span className="font-semibold text-slate-900">{invoice.vendorName}</span>.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Approval Remarks (Optional)
            </label>
            <textarea
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              rows={3}
              className="input-field text-xs"
            />
          </div>

          {actionError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{actionError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowApproveModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleApprove} disabled={actionLoading} className="btn-success text-xs">
              {actionLoading ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Invoice Submission">
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Rejecting this invoice will flag it in the ledger and notify the submitter. A clear mandatory reason is required for compliance audit.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Mandatory Rejection Reason *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="e.g. Mismatched quantities, billing dispute, or missing PO verification..."
              className="input-field text-xs"
              required
            />
          </div>

          {actionError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{actionError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleReject} disabled={actionLoading} className="btn-danger text-xs">
              {actionLoading ? 'Rejecting...' : 'Reject Invoice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment Settlement">
        <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono">
            <div className="flex justify-between text-slate-500">
              <span className="font-sans">Invoice Total:</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formatINR(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span className="font-sans">Outstanding Balance:</span>
              <span className="font-bold text-slate-900 tabular-nums">{formatINR(invoice.remainingAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              max={invoice.remainingAmount}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              className="input-field text-xs font-mono font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Settlement Channel
              </label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                className="input-field text-xs"
              >
                <option value="NEFT">NEFT Transfer</option>
                <option value="RTGS">RTGS Transfer</option>
                <option value="UPI">UPI Payment</option>
                <option value="BANK_TRANSFER">Bank Wire</option>
                <option value="CREDIT_CARD">Corporate Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Settlement Date
              </label>
              <input
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                className="input-field text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              UTR / Transaction Reference
            </label>
            <input
              type="text"
              value={paymentForm.transactionReference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
              placeholder="e.g. UTR123456789 or Ref #"
              className="input-field text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Payment Notes
            </label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              rows={2}
              className="input-field text-xs"
            />
          </div>

          {actionError && <p className="text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">{actionError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn-primary text-xs"
            >
              {actionLoading ? 'Recording...' : 'Record Payment in Ledger'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
