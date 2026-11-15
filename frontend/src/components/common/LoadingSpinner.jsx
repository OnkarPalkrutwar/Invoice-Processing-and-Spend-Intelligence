import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = 'Loading...', size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-2.5 text-slate-500">
      <Loader2 className={`${sizeClass} animate-spin text-zinc-900`} />
      {label && <p className="text-xs font-medium text-slate-600">{label}</p>}
    </div>
  );
};
