// src/utils/analyticsUtils.js
import {
  addDays, startOfDay, endOfDay, isWithinInterval, parseISO,
  startOfWeek, startOfMonth
} from 'date-fns';

/**
 * workSchedule esperado no formato:
 * {
 *   monday:    [{ start: "09:00", end: "18:00" }, ...],
 *   tuesday:   [...],
 *   ... sunday:[...]
 * }
 */
const DOW = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

function parseHHmm(s) {
  const [h,m] = s.split(':').map(Number);
  return { h: h||0, m: m||0 };
}

function minutesBetween(timeStart, timeEnd) {
  const a = parseHHmm(timeStart);
  const b = parseHHmm(timeEnd);
  return Math.max(0, (b.h*60 + b.m) - (a.h*60 + a.m));
}

/** Minutos disponíveis para UM DIA com base no workSchedule */
export function minutesAvailableForDay(workSchedule, date) {
  if (!workSchedule) return 0;
  const dow = DOW[date.getDay()];
  const ranges = workSchedule[dow] || [];
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
  heatmap[dow][hour] += 1;
}

/** Agrupamento auxiliar por chave */
export function sumTo(map, key, value) {
  map[key] = (map[key] || 0) + value;
}

/** Conversão segura numérica */
export const num = (v) => Number(v || 0);

/** Retorno binário 0/1 conforme intervalo */
export function inInterval(date, from, to) {
  return isWithinInterval(new Date(date), { start: new Date(from), end: new Date(to) });
}
