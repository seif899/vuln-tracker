import React from 'react';

export default function MetricCard({ title, value, subtitle, icon: Icon, color = 'cyan', alert = false }) {
  const colorStyles = {
    cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20',
    red: 'border-red-500/30 text-red-400 bg-red-950/20',
    orange: 'border-orange-500/30 text-orange-400 bg-orange-950/20',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
    purple: 'border-purple-500/30 text-purple-400 bg-purple-950/20',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-950/20'
  };

  const style = colorStyles[color] || colorStyles.cyan;

  return (
    <div className={`p-5 rounded-xl border bg-slate-900/80 backdrop-blur shadow-lg ${alert ? 'border-red-600/60 ring-1 ring-red-500/40' : 'border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${style}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
