import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatINR } from '../../utils/formatters';

const CATEGORY_COLORS = [
  '#18181b', // Deep Charcoal
  '#2563eb', // Cobalt Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#4f46e5', // Indigo
  '#64748b', // Slate
  '#0891b2', // Cyan
  '#7c3aed', // Purple
];

export const CategoryChart = ({ data = [] }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-2.5 rounded-lg shadow-dropdown text-xs space-y-1 border border-slate-200">
          <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">{item.category}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Spend:</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {formatINR(item.totalAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Share:</span>
            <span className="font-mono text-slate-700 tabular-nums">{item.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No category allocation recorded for this date range.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="totalAmount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* High-density category breakdown list */}
      <div className="mt-2 divide-y divide-slate-100 text-xs">
        {data.slice(0, 5).map((item, idx) => (
          <div key={item.category} className="py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
              />
              <span className="text-slate-700 truncate font-medium">{item.category}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-mono text-slate-500 text-[11px] tabular-nums">
                {formatINR(item.totalAmount)}
              </span>
              <span className="font-mono font-semibold text-slate-900 text-xs w-8 text-right tabular-nums">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
