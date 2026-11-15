import React from 'react';
import { getApprovalStatusConfig, getPaymentStatusConfig } from '../../utils/formatters';

export const ApprovalStatusBadge = ({ status }) => {
  const config = getApprovalStatusConfig(status);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.bg} tracking-tight select-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export const PaymentStatusBadge = ({ status }) => {
  const config = getPaymentStatusConfig(status);

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.bg} tracking-tight select-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
