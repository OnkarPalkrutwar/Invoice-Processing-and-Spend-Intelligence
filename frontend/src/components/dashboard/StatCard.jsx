import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'up',
  badge,
  alert = false,
  color = 'default',
}) => {
  return (
    <div
      className={`bg-white rounded-xl border transition-all p-4 shadow-card ${
        alert
          ? 'border-rose-300 bg-rose-50/20'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
          {value}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs min-h-[18px]">
          {trend !== undefined && (
            <div
              className={`flex items-center font-medium ${
                trendDirection === 'up' ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {trendDirection === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              )}
              <span className="font-mono tabular-nums">{trend > 0 ? `+${trend}%` : `${trend}%`}</span>
              <span className="text-slate-400 font-normal ml-1">vs prev</span>
            </div>
          )}

          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {badge}
            </span>
          )}

          {subtitle && <span className="text-[11px] text-slate-400 truncate">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};
