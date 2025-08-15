// src/controllers/finance/paymentMethodsController.js
import prisma from '../../prismaClient.js';

/* ========================= Helpers ========================= */
const bool = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v || '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
};
const norm = (s) => (typeof s === 'string' ? s.trim() : s);

/**
 * Carrega contagem de uso em payables/receivables por paymentMethodId.
 * Retorna: { [paymentMethodId]: { payables: number, receivables: number } }
 */
async function loadUsageStats(companyId, ids) {
  if (!ids.length) return {};

  const [pay, rec] = await Promise.all([
    prisma.payable.groupBy({
      by: ['paymentMethodId'],
      where: { companyId, paymentMethodId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.receivable.groupBy({
      by: ['paymentMethodId'],
      where: { companyId, paymentMethodId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const map = {};
  for (const r of pay) {
    if (!r.paymentMethodId) continue;
    map[r.paymentMethodId] = map[r.paymentMethodId] || { payables: 0, receivables: 0 };
    map[r.paymentMethodId].payables = r._count._all || 0;
  }
  for (const r of rec) {
    if (!r.paymentMethodId) continue;
    map[r.paymentMethodId = r.paymentMethodId] = map[r.paymentMethodId] || { payables: 0, receivables: 0 };
    map[r.paymentMethodId].receivables = r._count._all || 0;
  }
  return map;
}

/* ============================================================
 * LIST
 * GET /api/finance/payment-methods?q=...&withUsage=1
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const q = norm(req.query.q);
    const withUsage = bool(req.query.withUsage);

    const where = { companyId };
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const methods = await prisma.paymentMethod.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    if (!withUsage) {
      return res.json(methods);
    }

    const ids = methods.map((m) => m.id);
    const usage = await loadUsageStats(companyId, ids);

    const enriched = methods.map((m) => {
      const u = usage[m.id] || { payables: 0, receivables: 0 };
      const canDelete = (u.payables + u.receivables) === 0;
      return { ...m, usage: u, canDelete };
    });

    return res.json(enriched);
  } catch (e) {
    console.error('Erro list payment methods:', e);
    return res.status(500).json({ message: 'Erro ao listar formas de pagamento.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/payment-methods
 * Body: { name*, active? }
 * Regra: (companyId, name) é único → 409 em conflito.
 * ==========================================================*/
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = norm(req.body.name);
    const active =
      typeof req.body.active === 'boolean' ? req.body.active : (req.body.active == null ? true : Boolean(req.body.active));

    if (!name) {
      return res.status(400).json({ message: 'name é obrigatório.' });
    }

    try {
      const created = await prisma.paymentMethod.create({
        data: { companyId, name, active },
      });
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 'P2002') {
        // @@unique([companyId, name])
        return res
          .status(409)
          .json({ message: 'Já existe uma forma de pagamento com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create payment method:', e);
    return res.status(500).json({ message: 'Erro ao criar forma de pagamento.' });
  }
};

/* ============================================================
 * UPDATE
 * PUT /api/finance/payment-methods/:id
 * Body parcial: { name?, active? }
 * Trata conflito único se renomear para um nome já existente.
 * ==========================================================*/
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.paymentMethod.findFirst({
      where: { id, companyId },
    });
    if (!current) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });
    }

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const active =
      req.body.active !== undefined
        ? (typeof req.body.active === 'boolean' ? req.body.active : Boolean(req.body.active))
        : undefined;

    try {
      const updated = await prisma.paymentMethod.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res
          .status(409)
          .json({ message: 'Já existe uma forma de pagamento com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update payment method:', e);
    return res.status(500).json({ message: 'Erro ao atualizar forma de pagamento.' });
  }
};

/* ============================================================
 * DELETE
 * DELETE /api/finance/payment-methods/:id
 * Bloqueia exclusão se houver vínculos em payables/receivables.
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.paymentMethod.findFirst({
      where: { id, companyId },
    });
    if (!found) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });
    }

    const [payCount, recCount] = await Promise.all([
      prisma.payable.count({ where: { companyId, paymentMethodId: id } }),
      prisma.receivable.count({ where: { companyId, paymentMethodId: id } }),
    ]);

    if (payCount + recCount > 0) {
      return res.status(409).json({
        message:
          'Não é possível excluir: existem lançamentos vinculados a esta forma de pagamento.',
        usage: { payables: payCount, receivables: recCount },
      });
    }

    await prisma.paymentMethod.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete payment method:', e);
    return res.status(500).json({ message: 'Erro ao excluir forma de pagamento.' });
  }
};
