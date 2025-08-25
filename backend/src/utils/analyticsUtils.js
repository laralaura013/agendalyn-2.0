// backend/src/utils/analyticsUtils.js
import {
  addDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, startOfMonth
} from 'date-fns';

/** Aceita nomes em EN/PT */
const DOW_EN = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DOW_PT = ['domingo','segunda','terca','terça','quarta','quinta','sexta','sabado','sábado'];

const DOW_MAP = {
  0: ['sunday','domingo'],
  1: ['monday','segunda'],
  2: ['tuesday','terca','terça'],
  3: ['wednesday','quarta'],
  4: ['thursday','quinta'],
  5: ['friday','sexta'],
  6: ['saturday','sabado','sábado'],
};

function parseMaybeJson(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return v; }
  }
  return v;
}

function parseHHmm(s) {
  if (!s || typeof s !== 'string') return { h:0, m:0 };
  const [h,m] = s.split(':').map(n => Number(n) || 0);
  return { h, m };
}

function minutesBetween(timeStart, timeEnd) {
  const a = parseHHmm(timeStart);
  const b = parseHHmm(timeEnd);
  return Math.max(0, (b.h*60 + b.m) - (a.h*60 + a.m));
}

/** Normaliza um “range” (pode vir como string "09:00-18:00" ou objeto {start,end}) */
function normalizeRange(range) {
  if (!range) return null;
  if (typeof range === 'string') {
    // "09:00-18:00"
    const [start, end] = range.split('-').map(s => s?.trim());
    if (start && end) return { start, end };
    return null;
  }
  if (typeof range === 'object') {
    if (range.start && range.end) return { start: String(range.start), end: String(range.end) };
    // às vezes vem { from, to }
    if (range.from && range.to) return { start: String(range.from), end: String(range.to) };
  }
  return null;
}

/** Retorna um array de ranges para o dia informado (suporta múltiplos formatos de workSchedule) */
function rangesForDay(workSchedule, date) {
  if (!workSchedule) return [];
  let ws = parseMaybeJson(workSchedule);

  // Se veio como array direto, assume que é “mesmo todos os dias”
  if (Array.isArray(ws)) {
    return ws.map(normalizeRange).filter(Boolean);
  }

  // Map dia->ranges (EN/PT), aceitar valor único ou array
  const dow = date.getDay(); // 0..6
  const keysForDow = DOW_MAP[dow]; // ex: ['sunday','domingo']
  if (ws && typeof ws === 'object') {
    // Procura chave que exista (aceita diferentes capitalizações)
    const entries = Object.entries(ws);
    let foundVal = null;
    for (const [k, v] of entries) {
      const lk = String(k).toLowerCase();
      if (keysForDow.some(alias => lk === alias)) {
        foundVal = v;
        break;
      }
    }
    // fallback: nomes padrão inglês
    if (foundVal == null) {
      const enKey = DOW_EN[dow];
      if (ws[enKey] != null) foundVal = ws[enKey];
    }
    // se ainda não achou, tenta português
    if (foundVal == null) {
      const ptKeyCandidates = DOW_MAP[dow].filter(x => x !== 'sunday' && x !== 'saturday' && x !== 'monday' && x !== 'tuesday' && x !== 'wednesday' && x !== 'thursday' && x !== 'friday');
      for (const ptk of ptKeyCandidates) {
        if (ws[ptk] != null) { foundVal = ws[ptk]; break; }
      }
    }

    if (foundVal == null) return [];

    // pode ser string, objeto único ou array de objetos
    if (Array.isArray(foundVal)) {
      return foundVal.map(normalizeRange).filter(Boolean);
    }
    const single = normalizeRange(foundVal);
    return single ? [single] : [];
  }

  return [];
}

/** Minutos disponíveis para UM DIA com base no workSchedule */
export function minutesAvailableForDay(workSchedule, date) {
  const ranges = rangesForDay(workSchedule, date);
  if (!Array.isArray(ranges) || ranges.length === 0) return 0;
  return ranges.reduce((acc, r) => acc + minutesBetween(r.start, r.end), 0);
}

/** Minutos disponíveis no intervalo [from..to] para um staff */
export function minutesAvailableForRange(workSchedule, from, to) {
  if (!workSchedule) return 0;
  let total = 0;
  let d = startOfDay(from);
  const toEnd = endOfDay(to);
  while (d <= toEnd) {
    total += minutesAvailableForDay(workSchedule, d);
    d = addDays(d, 1);
  }
  return total;
}

export function truncateDate(date, groupBy) {
  const d = new Date(date);
  if (groupBy === 'month') return startOfMonth(d);
  if (groupBy === 'week')  return startOfWeek(d, { weekStartsOn: 1 });
  return startOfDay(d);
}

export function keyFor(date, groupBy) {
  const d = truncateDate(date, groupBy);
  if (groupBy === 'month') return d.toISOString().slice(0,7);  // YYYY-MM
  return d.toISOString().slice(0,10);                          // YYYY-MM-DD
}

/** Heatmap: matriz 7x24 (0=dom...6=sáb; 0..23 horas) */
export function initHeatmap() {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
}
export function upsertHeatmap(heatmap, date) {
  const dt = new Date(date);
  const dow = dt.getDay(); // 0..6
  const hour = dt.getHours(); // 0..23
  if (!heatmap[dow]) return;
  if (typeof heatmap[dow][hour] !== 'number') heatmap[dow][hour] = 0;
  heatmap[dow][hour] += 1;
}

/** Agrupamento auxiliar por chave */
export function sumTo(map, key, value) {
  map[key] = (map[key] || 0) + (Number.isFinite(value) ? value : 0);
}

/** Conversão segura numérica */
export const num = (v) => Number(v || 0);

/** Retorno binário 0/1 conforme intervalo */
export function inInterval(date, from, to) {
  return isWithinInterval(new Date(date), { start: new Date(from), end: new Date(to) });
}
