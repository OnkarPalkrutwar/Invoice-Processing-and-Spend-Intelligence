import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export const UpcomingPayments = ({ payments = [] }) => {
  if (payments.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        No pending payment obligations due in the next 30 days.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {payments.map((inv) => {
        const isPastDue = new Date(inv.dueDate) < new Date();

        return (
          <div
            key={inv._id}
            className="py-3 px-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-md mt-0.5 border ${
                  isPastDue
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isPastDue ? <AlertCircle className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
              </div>
              <div className="min-w-0">
                <Link
                  to={`/invoices/${inv._id}`}
                  className="text-xs font-semibold text-slate-900 hover:text-zinc-950 truncate block"
                >
                  #{inv.invoiceNumber} • {inv.vendorName}
                </Link>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span>Due {formatDate(inv.dueDate)}</span>
                  {isPastDue && (
                    <span className="text-rose-700 font-medium bg-rose-50 border border-rose-200 px-1 py-0.2 rounded text-[10px]">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right flex-shrink-0 ml-3 font-mono tabular-nums">
              <span className="text-xs font-bold text-slate-900 block">
                {formatINR(inv.remainingAmount)}
              </span>
              <span className="text-[10px] text-slate-400">
                total {formatINR(inv.totalAmount)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
