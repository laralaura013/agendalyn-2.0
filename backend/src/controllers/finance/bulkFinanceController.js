// backend/src/controllers/finance/bulkFinanceController.js
import prisma from '../../prismaClient.js';
import * as cashbox from '../../services/cashboxService.js';

/**
 * PATCH /api/finance/receivables/bulk/status
 * Body: { ids: string[], status: 'OPEN'|'RECEIVED'|'CANCELED', receivedAt?: ISO }
 */
export const receivablesBulkStatus = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { ids, status, receivedAt } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids é obrigatório (array não vazio).' });
    }
    const upStatus = String(status || '').toUpperCase();
    const allowed = new Set(['OPEN','RECEIVED','CANCELED']);
    if (!allowed.has(upStatus)) {
      return res.status(400).json({ message: 'status inválido.' });
    }

    const when = upStatus === 'RECEIVED' ? (receivedAt ? new Date(receivedAt) : new Date()) : null;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const found = await tx.receivable.findMany({
          where: { companyId, id: { in: ids } },
        });
        let updated = 0;

        for (const r of found) {
          const u = await tx.receivable.update({
            where: { id: r.id },
            data: { status: upStatus, receivedAt: when },
          });
          if (upStatus === 'RECEIVED') {
            await cashbox.ensureIncomeForReceivable(tx, companyId, u);
          } else {
            await cashbox.removeIncomeForReceivable(tx, u.id, companyId);
          }
          updated++;
        }
        return { matched: found.length, updated };
      });

      return res.json({ ...result });
    } catch (err) {
      if (err?.code === 'NO_OPEN_CASHIER') {
        return res.status(409).json({ message: err.message }); // caixa fechado
      }
      throw err;
    }
  } catch (e) {
    console.error('Erro receivablesBulkStatus:', e);
    return res.status(500).json({ message: 'Erro no processamento em lote (recebíveis).' });
  }
};

/**
 * PATCH /api/finance/payables/bulk/status
 * Body: { ids: string[], status: 'OPEN'|'PAID'|'CANCELED', paidAt?: ISO }
 */
export const payablesBulkStatus = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { ids, status, paidAt } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids é obrigatório (array não vazio).' });
    }
    const upStatus = String(status || '').toUpperCase();
    const allowed = new Set(['OPEN','PAID','CANCELED']);
    if (!allowed.has(upStatus)) {
      return res.status(400).json({ message: 'status inválido.' });
    }

    const when = upStatus === 'PAID' ? (paidAt ? new Date(paidAt) : new Date()) : null;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const found = await tx.payable.findMany({
          where: { companyId, id: { in: ids } },
        });
        let updated = 0;

        for (const p of found) {
          const u = await tx.payable.update({
            where: { id: p.id },
            data: { status: upStatus, paidAt: when },
          });
          if (upStatus === 'PAID') {
            await cashbox.ensureExpenseForPayable(tx, companyId, u);
          } else {
            await cashbox.removeForPayable(tx, u.id, companyId);
          }
          updated++;
        }
        return { matched: found.length, updated };
      });

      return res.json({ ...result });
    } catch (err) {
      if (err?.code === 'NO_OPEN_CASHIER') {
        return res.status(409).json({ message: err.message }); // caixa fechado
      }
      throw err;
    }
  } catch (e) {
    console.error('Erro payablesBulkStatus:', e);
    return res.status(500).json({ message: 'Erro no processamento em lote (pagáveis).' });
  }
};
