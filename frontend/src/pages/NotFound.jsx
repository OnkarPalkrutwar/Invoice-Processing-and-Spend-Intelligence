import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center mb-4">
        <FileQuestion className="w-6 h-6 text-slate-600" />
      </div>
      <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Resource Not Found</h1>
      <p className="mt-2 text-xs text-slate-500 max-w-sm leading-relaxed">
        The invoice, supplier profile, or workspace record you are attempting to locate does not exist or has been archived.
      </p>
      <Link to="/dashboard" className="btn-primary mt-6 text-xs py-2 px-4 inline-flex items-center gap-2">
        <ArrowLeft className="w-3.5 h-3.5" />
        Return to Financial Overview
      </Link>
    </div>
  );
};
