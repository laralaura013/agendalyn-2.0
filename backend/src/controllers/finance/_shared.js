// backend/src/controllers/finance/_shared.js
export const norm = (s) => (typeof s === 'string' ? s.trim() : s);

export const parseBool = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v ?? '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
};

export const getPageParams = (query, defaults = { page: 1, pageSize: 10 }) => {
  const page = Math.max(1, parseInt(query.page ?? defaults.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? defaults.pageSize, 10) || 10));
  const sortBy = (query.sortBy || 'name');
  const sortOrder = (query.sortOrder === 'desc' ? 'desc' : 'asc');
  return { page, pageSize, sortBy, sortOrder };
};

export const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const sendCsv = (res, filename, rows, header) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const out = [header.join(',')].concat(
    rows.map((r) => header.map((h) => csvEscape(r[h])).join(','))
  );
  res.status(200).send(out.join('\n'));
};
