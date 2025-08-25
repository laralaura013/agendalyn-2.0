import React from "react";

export default function Heatmap({ matrix = [] }) {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const maxVal = Math.max(1, ...matrix.flat().map((v) => Number(v || 0)));

  return (
    <div className="inline-grid" style={{ gridTemplateColumns: "64px repeat(24, minmax(16px, 1fr))", gap: 6 }}>
      <div />
      {Array.from({ length: 24 }, (_, h) => (
        <div key={`h-${h}`} className="text-[10px] text-muted-color text-center">{h}</div>
      ))}
      {days.map((d, row) => (
        <React.Fragment key={d}>
          <div className="text-xs text-muted-color pr-2 flex items-center justify-end">{d}</div>
          {Array.from({ length: 24 }, (_, col) => {
            const v = Number(matrix?.[row]?.[col] || 0);
            const alpha = v === 0 ? 0.06 : Math.min(0.95, v / maxVal);
            return (
              <div
                key={`${row}-${col}`}
                className="rounded-md neu-heat"
                style={{
                  height: 20,
                  background: `rgba(124,58,237,${alpha})`,
                  boxShadow: v ? "inset 2px 2px 4px rgba(0,0,0,0.15), inset -2px -2px 4px rgba(255,255,255,0.15)" : undefined,
                }}
                title={`${d} ${col}h — ${v} agendamento(s)`}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
