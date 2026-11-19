import React from 'react';
import { CircleDot, Clock, CheckCircle2, ShieldOff, ShieldAlert } from 'lucide-react';

const STATUS_CONFIG = {
  OPEN: {
    bg: 'bg-rose-950/60',
    text: 'text-rose-300',
    border: 'border-rose-800/60',
    label: 'Open',
    icon: CircleDot,
  },
  IN_PROGRESS: {
    bg: 'bg-sky-950/60',
    text: 'text-sky-300',
    border: 'border-sky-800/60',
    label: 'In Progress',
    icon: Clock,
  },
  MITIGATED: {
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-800/60',
    label: 'Mitigated',
    icon: CheckCircle2,
  },
  FALSE_POSITIVE: {
    bg: 'bg-zinc-800/60',
    text: 'text-zinc-400',
    border: 'border-zinc-700',
    label: 'False Positive',
    icon: ShieldOff,
  },
  ACCEPTED_RISK: {
    bg: 'bg-purple-950/60',
    text: 'text-purple-300',
    border: 'border-purple-800/60',
    label: 'Accepted Risk',
    icon: ShieldAlert,
  },
};

export default function StatusBadge({ status }) {
  const statKey = (status || 'OPEN').toUpperCase();
  const config = STATUS_CONFIG[statKey] || STATUS_CONFIG.OPEN;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  );
}
