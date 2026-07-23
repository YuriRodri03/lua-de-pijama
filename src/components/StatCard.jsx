import React from 'react';

export default function StatCard({ label, value, statusText, statusType = 'neutral' }) {
  const statusColors = {
    neutral: "text-slate-400",
    alert: "text-lua-rose-dark font-medium",
    gold: "text-lua-gold-dark font-medium"
  };

  return (
    <div className="bg-lua-cream/40 border border-lua-rose-dark/10 p-5 rounded-xl flex flex-col justify-between">
      <div>
        <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block">
          {label}
        </span>
        <span className="text-2xl font-bold text-slate-800 block mt-1">
          {value}
        </span>
      </div>
      {statusText && (
        <span className={`text-xs mt-2 block ${statusColors[statusType]}`}>
          {statusText}
        </span>
      )}
    </div>
  );
}