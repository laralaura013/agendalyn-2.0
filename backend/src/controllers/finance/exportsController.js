// backend/src/controllers/finance/exportsController.js
import prisma from '../../prismaClient.js';

/* Helpers compartilhados */
const normalizeId = (v) =>
  v && typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

const parseNumber = (v) => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return isFinite(n) ? n : undefined;
};

const csvEscape = (val) => {
  if (val == null) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const sendCsv = (res, filename, headers, rows) => {
  const lines = [];
  lines.push(headers.map(csvEscape).join(','));
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
};

/* ==================== Receivables CSV ==================== */
export const exportReceivablesCsv = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const {
      status, date_from, date_to, categoryId, clientId, orderId,
      paymentMethodId, minAmount, maxAmount, q,
      sortBy = 'dueDate', sortOrder = 'asc'
    } = req.query;

    const where = { companyId };

    if (status) {
      const arr = String(status).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (arr.length === 1) where.status = arr[0];
      else if (arr.length > 1) where.status = { in: arr };
    }

    if (categoryId) where.categoryId = String(categoryId);
    if (clientId) where.clientId = String(clientId);
    if (orderId) where.orderId = String(orderId);
    if (paymentMethodId) where.paymentMethodId = String(paymentMethodId);

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    const min = parseNumber(minAmount);
    const max = parseNumber(maxAmount);
    if (min != null || max != null) {
      where.amount = {};
      if (min != null) where.amount.gte = min;
      if (max != null) where.amount.lte = max;
    }

    if (q && String(q).trim()) {
      const query = String(q).trim();
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ];
    }

    const allowedSort = new Set(['dueDate', 'createdAt', 'updatedAt', 'amount', 'status']);
    const sortKey = allowedSort.has(String(sortBy)) ? String(sortBy) : 'dueDate';
    const orderBy = [{ [sortKey]: String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc' }, ...(sortKey !== 'createdAt' ? [{ createdAt: 'desc' }] : [])];

    const items = await prisma.receivable.findMany({
      where,
      include: {
        client: { select: { name: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
      orderBy,
      take: 50000, // limite de segurança
    });

    const headers = [
      'id', 'dueDate', 'amount', 'status', 'receivedAt',
      'client', 'category', 'paymentMethod', 'notes'
    ];
    const rows = items.map(r => ({
      id: r.id,
      dueDate: r.dueDate?.toISOString()?.slice(0,10) || '',
      amount: Number(r.amount).toFixed(2),
      status: r.status,
      receivedAt: r.receivedAt ? new Date(r.receivedAt).toISOString().slice(0,19) : '',
      client: r.client?.name || '',
      category: r.category?.name || '',
      paymentMethod: r.paymentMethod?.name || '',
      notes: r.notes || '',
    }));

    return sendCsv(res, 'receivables.csv', headers, rows);
  } catch (e) {
    console.error('Erro exportReceivablesCsv:', e);
    return res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};

/* ==================== Payables CSV ==================== */
export const exportPayablesCsv = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(400).json({ message: 'Empresa não identificada.' });

    const {
      status, date_from, date_to, categoryId, supplierId,
      paymentMethodId, minAmount, maxAmount, q,
      sortBy = 'dueDate', sortOrder = 'asc'
    } = req.query;

    const where = { companyId };

    if (status) {
      const arr = String(status).split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (arr.length === 1) where.status = arr[0];
      else if (arr.length > 1) where.status = { in: arr };
    }

    if (categoryId) where.categoryId = String(categoryId);
    if (supplierId) where.supplierId = String(supplierId);
    if (paymentMethodId) where.paymentMethodId = String(paymentMethodId);

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    const min = parseNumber(minAmount);
    const max = parseNumber(maxAmount);
    if (min != null || max != null) {
      where.amount = {};
      if (min != null) where.amount.gte = min;
      if (max != null) where.amount.lte = max;
    }

    if (q && String(q).trim()) {
      const query = String(q).trim();
      where.OR = [{ notes: { contains: query, mode: 'insensitive' } }];
    }

    const allowedSort = new Set(['dueDate', 'createdAt', 'updatedAt', 'amount', 'status']);
    const sortKey = allowedSort.has(String(sortBy)) ? String(sortBy) : 'dueDate';
    const orderBy = [{ [sortKey]: String(sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc' }, ...(sortKey !== 'createdAt' ? [{ createdAt: 'desc' }] : [])];

    const items = await prisma.payable.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
      orderBy,
      take: 50000,
    });

    const headers = [
      'id', 'dueDate', 'amount', 'status', 'paidAt',
      'supplier', 'category', 'paymentMethod', 'notes'
    ];
    const rows = items.map(p => ({
      id: p.id,
      dueDate: p.dueDate?.toISOString()?.slice(0,10) || '',
      amount: Number(p.amount).toFixed(2),
      status: p.status,
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString().slice(0,19) : '',
      supplier: p.supplier?.name || '',
      category: p.category?.name || '',
      paymentMethod: p.paymentMethod?.name || '',
      notes: p.notes || '',
    }));

    return sendCsv(res, 'payables.csv', headers, rows);
  } catch (e) {
    console.error('Erro exportPayablesCsv:', e);
    return res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};
