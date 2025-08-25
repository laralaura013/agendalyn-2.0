// src/components/performance/Heatmap.jsx
import React, { useMemo } from 'react';

const DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function Heatmap({ data }) {
  // data: [7][24] contagens
  const max = useMemo(() => {
    if (!data?.length) return 0;
    return data.reduce((m,row)=> Math.max(m, ...row), 0);
  }, [data]);

  if (!data?.length) return <p className="text-sm opacity-70">Sem dados.</p>;

  return (
    <div className="overflow-auto">
      <table className="text-xs min-w-[640px]">
        <thead>
          <tr>
            <th className="p-1 text-left">Dia/Hora</th>
            {Array.from({length:24},(_,h)=><th key={h} className="p-1 text-center">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx)=>(
            <tr key={idx}>
              <td className="p-1 pr-3">{DOW[idx]}</td>
              {row.map((val,h)=> {
                const intensity = max ? (val / max) : 0;
                const bg = `rgba(147,51,234,${0.12 + 0.6*intensity})`; // roxo com alpha
                return (
                  <td key={h} className="p-1">
                    <div className="h-6 w-6 rounded" style={{ background: bg }} title={`${val}`}></div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
