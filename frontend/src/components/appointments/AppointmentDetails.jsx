import React from 'react';
import { asArray } from '../../utils/asArray';

export default function AppointmentDetails({ appointment }) {
  if (!appointment) return <div className="text-sm text-gray-500">Carregando...</div>;

  const service  = appointment.service || null;                       // objeto único
  const services = asArray(appointment.services ?? service);          // lista segura
  const items    = asArray(appointment.items);
  const payments = asArray(appointment.payments);
  const addons   = asArray(appointment.service?.addons);
  const tags     = asArray(appointment.client?.tags);

  return (
    <div className="space-y-4">
      <section>
        <h3 className="font-semibold mb-1">Serviço(s)</h3>
        {services.map((s) => (
          <div key={s.id || s.name} className="text-sm">
            {s.name} — {s.duration ?? 0}min — R$ {Number(s.price || 0).toFixed(2)}
          </div>
        ))}
      </section>

      <section>
        <h3 className="font-semibold mb-1">Adicionais</h3>
        {addons.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhum adicional</div>
        ) : (
          addons.map((a) => <div key={a.id || a.name} className="text-sm">{a.name}</div>)
        )}
      </section>

      <section>
        <h3 className="font-semibold mb-1">Itens</h3>
        {items.map((it) => (
          <div key={it.id || `${it.name}-${it.price}`} className="text-sm">
            {it.quantity ?? 1}× {it.name} — R$ {Number(it.price || 0).toFixed(2)}
          </div>
        ))}
      </section>

      <section>
        <h3 className="font-semibold mb-1">Pagamentos</h3>
        {payments.map((p) => (
          <div key={p.id || `${p.method}-${p.amount}`} className="text-sm">
            {p.methodName || p.method || 'Forma'} — R$ {Number(p.amount || 0).toFixed(2)}
          </div>
        ))}
      </section>

      <section>
        <h3 className="font-semibold mb-1">Cliente</h3>
        <div className="text-sm">{appointment.client?.name || '—'}</div>
        <div className="text-sm text-gray-600">{appointment.client?.phone || '—'}</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {tags.map((t, i) => (
            <span key={i} className="px-2 py-0.5 text-xs rounded bg-gray-100">{t}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold mb-1">Profissional</h3>
        <div className="text-sm">{appointment.user?.name || '—'}</div>
      </section>

      <section>
        <h3 className="font-semibold mb-1">Observações</h3>
        <div className="text-sm whitespace-pre-wrap">
          {String(appointment.notes || '').trim() || '—'}
        </div>
      </section>
    </div>
  );
}
