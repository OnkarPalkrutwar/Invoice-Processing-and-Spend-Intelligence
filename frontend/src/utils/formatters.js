/**
 * Formatting helpers for Indian Rupee currency and Indian dates
 */

export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumberIndian = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

/**
 * Human-designed desaturated status badges (Stripe / GitHub / Linear style)
 */
export const getApprovalStatusConfig = (status) => {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Approved',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dot: 'bg-emerald-500',
      };
    case 'PENDING_APPROVAL':
      return {
        label: 'Pending Approval',
        bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-500',
      };
    case 'UNDER_REVIEW':
      return {
        label: 'Under Review',
        bg: 'bg-sky-50 text-sky-800 border-sky-200/80',
        dot: 'bg-sky-500',
      };
    case 'UPLOADED':
      return {
        label: 'Uploaded',
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        dot: 'bg-zinc-400',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        bg: 'bg-rose-50 text-rose-800 border-rose-200/80',
        dot: 'bg-rose-500',
      };
    case 'PROCESSING':
      return {
        label: 'Processing OCR',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
        dot: 'bg-indigo-500',
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        dot: 'bg-zinc-400',
      };
  }
};

export const getPaymentStatusConfig = (status) => {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dot: 'bg-emerald-500',
      };
    case 'PARTIALLY_PAID':
      return {
        label: 'Partially Paid',
        bg: 'bg-blue-50 text-blue-800 border-blue-200/80',
        dot: 'bg-blue-500',
      };
    case 'OVERDUE':
      return {
        label: 'Overdue',
        bg: 'bg-rose-50 text-rose-800 border-rose-200/80',
        dot: 'bg-rose-600',
      };
    case 'UNPAID':
      return {
        label: 'Unpaid',
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        dot: 'bg-zinc-400',
      };
    default:
      return {
        label: status || 'Unknown',
        bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        dot: 'bg-zinc-400',
      };
  }
};
