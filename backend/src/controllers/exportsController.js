// backend/src/controllers/exportsController.js
import prisma from '../prismaClient.js';

/* util: data início/fim do dia */
const parseDayBoundary = (isoOrDateOnly, end = false) => {
  if (!isoOrDateOnly) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDateOnly)) {
    return new Date(`${isoOrDateOnly}T${end ? '23:59:59.999' : '00:00:00.000'}`);
  }
  const d = new Date(isoOrDateOnly);
  return isNaN(d.getTime()) ? undefined : d;
};

/* util: gera CSV com escape correto e headers dinâmicos */
function toCsv(rows, headers) {
  const escapeCell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const head = headers.map(h => h.label).join(',');
  const body = rows
    .map(r => headers.map(h => escapeCell(h.pick(r))).join(','))
    .join('\n');

  return `${head}\n${body}`;
}

/* =========================================
   /exports/receivables.csv
   Query (opcional): status, date_from, date_to, clientId, orderId, categoryId, paymentMethodId
   ========================================= */
export const exportReceivablesCsv = async (req, res) => {
  try {
    const companyId = req.company.id;
    const {
      status,
      date_from,
      date_to,
      clientId,
      orderId,
      categoryId,
      paymentMethodId,
    } = req.query || {};

    const where = { companyId };

    // status: aceita único ou múltiplos separados por vírgula
    if (status) {
      const arr = String(status)
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      if (arr.length === 1) where.status = arr[0];
      else if (arr.length > 1) where.status = { in: arr };
    }

    if (clientId) where.clientId = clientId;
    if (orderId) where.orderId = orderId;
    if (categoryId) where.categoryId = categoryId;
    if (paymentMethodId) where.paymentMethodId = paymentMethodId;

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    const rows = await prisma.receivable.findMany({
      where,
      include: {
        client: { select: { name: true } },
        order: { select: { id: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const headers = [
      { label: 'ID', pick: r => r.id },
      { label: 'Status', pick: r => r.status },
      { label: 'Vencimento', pick: r => r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '' },
      { label: 'RecebidoEm', pick: r => r.receivedAt ? new Date(r.receivedAt).toISOString() : '' },
      { label: 'Valor', pick: r => Number(r.amount ?? 0).toFixed(2) },
      { label: 'Cliente', pick: r => r.client?.name || '' },
      { label: 'Comanda', pick: r => r.order?.id || '' },
      { label: 'Categoria', pick: r => r.category?.name || '' },
      { label: 'Forma de Pagamento', pick: r => r.paymentMethod?.name || '' },
      { label: 'Observações', pick: r => r.notes || '' },
    ];

    const csv = toCsv(rows, headers);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="receivables.csv"');
    return res.status(200).send(csv);
  } catch (e) {
    console.error('Erro exportReceivablesCsv:', e);
    return res.status(500).json({ message: 'Erro ao exportar receivíveis.' });
  }
};

/* =========================================
   /exports/payables.csv
   Query (opcional): status, date_from, date_to, supplierId, categoryId, paymentMethodId
   ========================================= */
export const exportPayablesCsv = async (req, res) => {
  try {
    const companyId = req.company.id;
    const {
      status,
      date_from,
      date_to,
      supplierId,
      categoryId,
      paymentMethodId,
    } = req.query || {};

    const where = { companyId };

    if (status) {
      const arr = String(status)
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      if (arr.length === 1) where.status = arr[0];
      else if (arr.length > 1) where.status = { in: arr };
    }

    if (supplierId) where.supplierId = supplierId;
    if (categoryId) where.categoryId = categoryId;
    if (paymentMethodId) where.paymentMethodId = paymentMethodId;

    const gte = parseDayBoundary(date_from, false);
    const lte = parseDayBoundary(date_to, true);
    if (gte || lte) {
      where.dueDate = {};
      if (gte) where.dueDate.gte = gte;
      if (lte) where.dueDate.lte = lte;
    }

    const rows = await prisma.payable.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
        paymentMethod: { select: { name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const headers = [
      { label: 'ID', pick: r => r.id },
      { label: 'Status', pick: r => r.status },
      { label: 'Vencimento', pick: r => r.dueDate ? r.dueDate.toISOString().slice(0, 10) : '' },
      { label: 'PagoEm', pick: r => r.paidAt ? new Date(r.paidAt).toISOString() : '' },
      { label: 'Valor', pick: r => Number(r.amount ?? 0).toFixed(2) },
      { label: 'Fornecedor', pick: r => r.supplier?.name || '' },
      { label: 'Categoria', pick: r => r.category?.name || '' },
      { label: 'Forma de Pagamento', pick: r => r.paymentMethod?.name || '' },
      { label: 'Observações', pick: r => r.notes || '' },
    ];

    const csv = toCsv(rows, headers);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="payables.csv"');
    return res.status(200).send(csv);
  } catch (e) {
    console.error('Erro exportPayablesCsv:', e);
    return res.status(500).json({ message: 'Erro ao exportar pagáveis.' });
  }
};
