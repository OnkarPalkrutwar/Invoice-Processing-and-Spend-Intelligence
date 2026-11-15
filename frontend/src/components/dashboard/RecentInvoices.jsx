import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText } from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';
import { ApprovalStatusBadge, PaymentStatusBadge } from '../common/InvoiceStatusBadge';

export const RecentInvoices = ({ invoices = [] }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th className="py-2.5 px-4">Invoice #</th>
            <th className="py-2.5 px-4">Vendor</th>
            <th className="py-2.5 px-4">Date</th>
            <th className="py-2.5 px-4 text-right">Amount</th>
            <th className="py-2.5 px-4">Approval</th>
            <th className="py-2.5 px-4">Payment</th>
            <th className="py-2.5 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan="7" className="py-8 text-center text-xs text-slate-400">
                No recent invoices recorded in the ledger.
              </td>
            </tr>
          ) : (
            invoices.map((inv) => (
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
                  <Link
                    to={`/invoices/${inv._id}`}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600 hover:text-zinc-950 transition-colors"
                  >
                    Details <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
