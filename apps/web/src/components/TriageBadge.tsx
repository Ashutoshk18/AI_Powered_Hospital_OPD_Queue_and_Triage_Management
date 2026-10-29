import React from 'react';

interface TriageBadgeProps {
  tier: number;
  showDetails?: boolean;
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({ tier, showDetails = false }) => {
  const configs: Record<number, { label: string; bg: string; text: string; border: string }> = {
    1: { label: 'Tier 1 - Resuscitation', bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
    2: { label: 'Tier 2 - Emergent', bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
    3: { label: 'Tier 3 - Urgent', bg: 'bg-amber-400', text: 'text-amber-950', border: 'border-amber-500' },
    4: { label: 'Tier 4 - Routine', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    5: { label: 'Tier 5 - Minor', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  };

  const current = configs[tier] || configs[4];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${current.bg} ${current.text} ${current.border}`}
    >
      {showDetails ? current.label : `Tier ${tier}`}
    </span>
  );
};
