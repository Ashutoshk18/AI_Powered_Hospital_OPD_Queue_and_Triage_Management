import React from 'react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    WAITING: 'bg-amber-100 text-amber-800 border-amber-200',
    CALLED: 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse',
    IN_CONSULTATION: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-rose-100 text-rose-700 border-rose-200',
    SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const style = styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {status.replace('_', ' ')}
    </span>
  );
};
