import React, { useEffect, useMemo, useState } from 'react';
import { asArray } from '../../utils/asArray';

/* ========================= Constantes ========================= */
const ROLES = [
  { value: 'STAFF',        label: 'Colaborador(a)' },
  { value: 'BARBER',       label: 'Barbeiro(a)' },
  { value: 'HAIRDRESSER',  label: 'Cabeleireiro(a)' },
  { value: 'MANAGER',      label: 'Gestor(a)' },
  { value: 'ADMIN',        label: 'Administrador(a)' },
  { value: 'OWNER',        label: 'Dono(a)' },
];

const weekDays = [
  { key: 'sunday',    label: 'Dom' },
  { key: 'monday',    label: 'Seg' },
  { key: 'tuesday',   label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday',  label: 'Qui' },
  { key: 'friday',    label: 'Sex' },
  { key: 'saturday',  label: 'Sáb' },
];

const DEFAULT_START = '09:00';
const DEFAULT_END   = '18:00';

/* ========================= Helpers ========================= */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const buildDefaultSchedule = () => {
  const sc = {};
  weekDays.forEach((d) => {
    sc[d.key] = { active: true, start: DEFAULT_START, end: DEFAULT_END };
  });
  return sc;
};

const sanitizePayload = (data) => {
  const out = {};
  Object.entries(data).forEach(([k, v]) => {
    if (v === '' || v == null) return;
    if (k === 'commission') {
      const n = Number(v);
      if (!isNaN(n)) out[k] = n;
      return;
    }
    out[k] = v;
  });
  return out;
};

const compareTime = (a, b) => a.localeCompare(b);

/* ========================= Componente ========================= */
const StaffForm = ({ initialData, onSave, onCancel }) => {
  const isEdit = Boolean(initialData?.id);

  const [tab, setTab] = useState('main'); // main | schedule | options

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    password: '',
    showInBooking: true,
    commission: '',
    phone: '',
    nickname: '',
  });

  const [workSchedule, setWorkSchedule] = useState(buildDefaultSchedule());

  const [bulkStart, setBulkStart] = useState(DEFAULT_START);
  const [bulkEnd, setBulkEnd] = useState(DEFAULT_END);

  useEffect(() => {
    if (!initialData) return;

    setFormData((prev) => ({
      ...prev,
      name: initialData.name || '',
      email: initialData.email || '',
      role: initialData.role || 'STAFF',
      password: '',
      showInBooking:
        typeof initialData.showInBooking === 'boolean'
          ? initialData.showInBooking
          : true,
      commission:
        initialData.commission === 0 || initialData.commission
          ? String(initialData.commission)
          : '',
      phone: initialData.phone || '',
      nickname: initialData.nickname || '',
    }));

    if (initialData.workSchedule && Object.keys(initialData.workSchedule).length) {
      // mescla com defaults para garantir todos os dias
      const merged = buildDefaultSchedule();
      Object.entries(initialData.workSchedule).forEach(([k, v]) => {
        merged[k] = { ...merged[k], ...v };
      });
      setWorkSchedule(deepClone(merged));
    }
  }, [initialData]);

  /* ========================= Manipuladores ========================= */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleScheduleChange = (dayKey, field, value) => {
    setWorkSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  const toggleAll = (active) => {
    setWorkSchedule((prev) => {
      const next = deepClone(prev);
      weekDays.forEach((d) => (next[d.key].active = active));
      return next;
    });
  };

  const copyMondayToAll = () => {
    setWorkSchedule((prev) => {
      const next = deepClone(prev);
      const m = next.monday || { active: true, start: DEFAULT_START, end: DEFAULT_END };
      weekDays.forEach((d) => {
        if (d.key === 'monday') return;
        next[d.key] = { ...m };
      });
      return next;
    });
  };

  const applyBulkTimes = () => {
    setWorkSchedule((prev) => {
      const next = deepClone(prev);
      weekDays.forEach((d) => {
        next[d.key].start = bulkStart;
        next[d.key].end = bulkEnd;
      });
      return next;
    });
  };

  const preset_9_18 = () => {
    setBulkStart('09:00');
    setBulkEnd('18:00');
    setWorkSchedule((prev) => {
      const next = deepClone(prev);
      weekDays.forEach((d) => (next[d.key] = { active: true, start: '09:00', end: '18:00' }));
      return next;
    });
  };

  const preset_10_19 = () => {
    setBulkStart('10:00');
    setBulkEnd('19:00');
    setWorkSchedule((prev) => {
      const next = deepClone(prev);
      weekDays.forEach((d) => (next[d.key] = { active: true, start: '10:00', end: '19:00' }));
      return next;
    });
  };

  /* ========================= Validação ========================= */
  const scheduleErrors = useMemo(() => {
    const errs = {};
    weekDays.forEach(({ key }) => {
      const d = workSchedule[key];
      if (!d?.active) return;
      if (!d.start || !d.end) {
        errs[key] = 'Defina início e fim';
        return;
      }
      if (compareTime(d.end, d.start) <= 0) {
        errs[key] = 'Fim deve ser maior que início';
      }
    });
    return errs;
  }, [workSchedule]);

  const hasAnyActiveDay = useMemo(
    () => weekDays.some(({ key }) => workSchedule[key]?.active),
    [workSchedule]
  );

  const validate = () => {
    if (!formData.name.trim()) return 'Informe o nome.';
    if (!formData.email.trim()) return 'Informe o e-mail.';
    if (!isEdit && !formData.password) return 'Defina uma senha para o colaborador.';
    if (formData.commission !== '') {
      const n = Number(formData.commission);
      if (isNaN(n) || n < 0 || n > 100) return 'Comissão deve estar entre 0 e 100.';
    }
    if (!hasAnyActiveDay) return 'Ative ao menos um dia de trabalho.';
    const hasErr = Object.keys(scheduleErrors).length > 0;
    if (hasErr) return 'Verifique os horários: há dia(s) com erro.';
    return null;
  };

  /* ========================= Submit ========================= */
  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const payload = sanitizePayload({
      ...formData,
      workSchedule,
    });

    onSave(payload);
  };

  /* ========================= UI ========================= */
  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-3xl">
      <h2 className="text-2xl font-bold">
        {isEdit ? 'Editar Colaborador' : 'Novo Colaborador'}
      </h2>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {[
            { id: 'main', label: 'Dados Pessoais' },
            { id: 'schedule', label: 'Horário de Trabalho' },
            { id: 'options', label: 'Opções' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap py-3 text-sm border-b-2 ${
                tab === t.id
                  ? 'border-purple-600 font-medium text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      {tab === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome*</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email*</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Função</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
            >
              {asArray(ROLES).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Senha {isEdit ? '(opcional)' : '*'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
              placeholder={isEdit ? 'Deixe em branco para não alterar' : ''}
              required={!isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Telefone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="(11) 98765-4321"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Apelido</label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="Como o cliente vê no app"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Comissão (%)</label>
            <input
              type="number"
              name="commission"
              value={formData.commission}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border rounded"
              placeholder="Ex: 10 para 10%"
              step="0.1"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use números inteiros ou decimais (ex.: 7.5).
            </p>
          </div>

          <div className="md:col-span-2 flex items-center">
            <input
              id="showInBooking"
              name="showInBooking"
              type="checkbox"
              checked={formData.showInBooking}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="showInBooking" className="ml-2 block text-sm text-gray-900">
              Visível na página de agendamento público
            </label>
          </div>
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-4">
          {/* Ferramentas rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleAll(true)}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50"
            >
              Ativar todos
            </button>
            <button
              type="button"
              onClick={() => toggleAll(false)}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50"
            >
              Desativar todos
            </button>
            <button
              type="button"
              onClick={copyMondayToAll}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50"
            >
              Copiar segunda → todos
            </button>

            <span className="mx-2 text-gray-300">|</span>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Aplicar a todos:</span>
              <input
                type="time"
                value={bulkStart}
                onChange={(e) => setBulkStart(e.target.value)}
                className="p-1 border rounded text-sm"
              />
              <span className="text-sm">-</span>
              <input
                type="time"
                value={bulkEnd}
                onChange={(e) => setBulkEnd(e.target.value)}
                className="p-1 border rounded text-sm"
              />
              <button
                type="button"
                onClick={applyBulkTimes}
                className="px-3 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50"
              >
                Aplicar
              </button>
            </div>

            <span className="mx-2 text-gray-300">|</span>

            <button
              type="button"
              onClick={preset_9_18}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50"
            >
              Preset 09:00–18:00
            </button>
            <button
              type="button"
              onClick={preset_10_19}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 hover:bg-gray-50"
            >
              Preset 10:00–19:00
            </button>
          </div>

          {/* Lista de dias */}
          <div className="space-y-3">
            {asArray(weekDays).map((day) => {
              const d = workSchedule[day.key] || { active: false, start: '', end: '' };
              const err = scheduleErrors[day.key];
              return (
                <div key={day.key} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3 flex items-center">
                    <input
                      type="checkbox"
                      id={`active-${day.key}`}
                      checked={d.active || false}
                      onChange={(e) =>
                        handleScheduleChange(day.key, 'active', e.target.checked)
                      }
                      className="h-4 w-4 rounded"
                    />
                    <label htmlFor={`active-${day.key}`} className="ml-2 text-sm">
                      {day.label}
                    </label>
                  </div>

                  {d.active ? (
                    <>
                      <div className="col-span-4">
                        <input
                          type="time"
                          value={d.start || ''}
                          onChange={(e) =>
                            handleScheduleChange(day.key, 'start', e.target.value)
                          }
                          className={`w-full p-1 border rounded-md text-sm ${
                            err ? 'border-red-300' : ''
                          }`}
                        />
                      </div>
                      <div className="col-span-1 text-center">-</div>
                      <div className="col-span-4">
                        <input
                          type="time"
                          value={d.end || ''}
                          onChange={(e) =>
                            handleScheduleChange(day.key, 'end', e.target.value)
                          }
                          className={`w-full p-1 border rounded-md text-sm ${
                            err ? 'border-red-300' : ''
                          }`}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="col-span-9 text-sm text-gray-400">Fechado</div>
                  )}

                  {err && (
                    <div className="col-span-12 text-xs text-red-600">{err}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'options' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              Opções complementares (não obrigatórias). Campos vazios não serão enviados.
            </p>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex justify-between items-center pt-2">
        <div className="text-xs text-gray-500">
          {isEdit ? 'Editando colaborador existente' : 'Criando novo colaborador'}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-md"
          >
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-purple-700 text-white rounded-md">
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
};

export default StaffForm;
