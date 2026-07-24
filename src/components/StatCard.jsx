import React from 'react';

export default function StatCard({ label, value, statusText, statusType = 'neutral' }) {
  const statusColors = {
    neutral: "text-slate-400",
    alert: "text-lua-rose-dark font-medium",
    gold: "text-lua-gold-dark font-medium"
  };

  return (
    <div className="bg-lua-cream/40 border border-lua-rose-dark/10 p-4 md:p-5 rounded-xl flex flex-col justify-between h-full">
      <div>
        <span className="text-[10px] md:text-xs uppercase tracking-wider font-semibold text-slate-400 block">
          {label}
        </span>
        {/* Tamanho da fonte ajustado para mobile e com quebra de linha caso o número seja gigante */}
        <span className="text-xl md:text-2xl font-bold text-slate-800 block mt-1 break-words">
          {value}
        </span>
      </div>
      {statusText && (
        <span className={`text-[11px] md:text-xs mt-2 block ${statusColors[statusType]}`}>
          {statusText}
        </span>
      )}
    </div>
  );
}