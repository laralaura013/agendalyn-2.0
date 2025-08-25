import React from "react";
import NeuCard from "../../components/ui/NeuCard";

export default function MetricCard({ icon, label, value, chip }) {
  return (
    <NeuCard className="p-5">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-base-color">{label}</div>
        <div className="neumorphic-inset p-2 rounded-xl">{icon}</div>
      </div>
      <div className="mt-2 text-3xl font-extrabold text-base-color">{value}</div>
      {chip ? (
        <div className="mt-3">
          <span className="neu-chip px-2 py-1 text-accent-strong">{chip}</span>
        </div>
      ) : null}
    </NeuCard>
  );
}
