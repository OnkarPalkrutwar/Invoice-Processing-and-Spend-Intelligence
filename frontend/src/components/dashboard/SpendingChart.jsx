import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatINR } from '../../utils/formatters';

export const SpendingChart = ({ data = [] }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-dropdown text-xs space-y-1.5 border border-slate-200">
          <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">{label}</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-900" />
              Invoiced:
            </span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatINR(payload[0]?.value)}
            </span>
          </div>
          {payload[1] && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Settled:
              </span>
              <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                {formatINR(payload[1]?.value)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) =>
              `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : `${(val / 1000).toFixed(0)}k`}`
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '16px', fontSize: '11px' }}
          />
          <Line
            type="monotone"
            name="Invoiced Spend"
            dataKey="totalInvoiced"
            stroke="#18181b"
            strokeWidth={2}
            dot={{ r: 3, fill: '#18181b', strokeWidth: 1, stroke: '#fff' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            name="Settled Payments"
            dataKey="totalPaid"
            stroke="#059669"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: '#059669' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
