// src/components/performance/MetricCard.jsx
import React from 'react';

export default function MetricCard({ label, value, hint, icon }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon ? <span className="w-4 h-4">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-lg font-semibold">{value ?? '—'}</div>
      {hint ? <div className="text-xs text-zinc-500 mt-1">{hint}</div> : null}
    </div>
  );
}
