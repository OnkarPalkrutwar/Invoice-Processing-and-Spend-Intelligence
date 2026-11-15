import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export const ErrorState = ({ message = 'Failed to load data', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-rose-50/50 rounded-xl border border-rose-200/80 text-center">
      <AlertCircle className="w-8 h-8 text-rose-600 mb-2 stroke-[1.75]" />
      <h4 className="text-xs font-semibold text-rose-900 tracking-tight">Operation Unsuccessful</h4>
      <p className="mt-1 text-xs text-rose-700/90 max-w-md leading-relaxed">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry} 
          type="button"
          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-800 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry Request
        </button>
      )}
    </div>
  );
};
