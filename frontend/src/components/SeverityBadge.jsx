import React from 'react';
import { Flame, AlertTriangle, AlertCircle, Info, HelpCircle } from 'lucide-react';

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-red-950/80',
    text: 'text-red-400',
    border: 'border-red-800/80',
    icon: Flame,
    label: 'Critical'
  },
  HIGH: {
    bg: 'bg-orange-950/80',
    text: 'text-orange-400',
    border: 'border-orange-800/80',
    icon: AlertTriangle,
    label: 'High'
  },
  MEDIUM: {
    bg: 'bg-amber-950/80',
    text: 'text-amber-400',
    border: 'border-amber-800/80',
    icon: AlertCircle,
    label: 'Medium'
  },
  LOW: {
    bg: 'bg-blue-950/80',
    text: 'text-blue-400',
    border: 'border-blue-800/80',
    icon: Info,
    label: 'Low'
  },
  UNKNOWN: {
    bg: 'bg-slate-800/80',
    text: 'text-slate-400',
    border: 'border-slate-700',
    icon: HelpCircle,
    label: 'Unknown'
  }
};

export default function SeverityBadge({ severity, showIcon = true, size = 'sm' }) {
  const sevKey = (severity || 'UNKNOWN').toUpperCase();
  const config = SEVERITY_CONFIG[sevKey] || SEVERITY_CONFIG.UNKNOWN;
  const Icon = config.icon;

  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1 text-sm font-semibold' 
    : 'px-2.5 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      <span>{config.label}</span>
    </span>
  );
}
