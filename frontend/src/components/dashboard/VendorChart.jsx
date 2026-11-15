import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatINR } from '../../utils/formatters';

export const VendorChart = ({ data = [] }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-2.5 rounded-lg shadow-dropdown text-xs space-y-1 border border-slate-200">
          <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">{item.vendorName}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Cumulative Spend:</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatINR(item.totalSpent)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Invoice Count:</span>
            <span className="font-mono text-slate-700 tabular-nums">{item.invoiceCount} invoices</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No supplier spending data recorded.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    shortName: d.vendorName.length > 18 ? `${d.vendorName.substring(0, 16)}...` : d.vendorName,
  }));

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            tickFormatter={(val) =>
              `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${(val / 1000).toFixed(0)}k`}`
            }
          />
          <YAxis
            type="category"
            dataKey="shortName"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalSpent" fill="#18181b" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
