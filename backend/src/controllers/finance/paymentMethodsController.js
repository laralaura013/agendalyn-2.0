// src/controllers/finance/paymentMethodsController.js
import prisma from '../../prismaClient.js';
import { norm, parseBool, getPageParams, sendCsv } from './_shared.js';

/** uso em payables/receivables por paymentMethodId */
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
    map[r.paymentMethodId] = map[r.paymentMethodId] || { payables: 0, receivables: 0 };
    map[r.paymentMethodId].receivables = r._count._all || 0;
  }
  return map;
}

/* LIST: GET /api/finance/payment-methods?page=&pageSize=&q=&active=true|false|ALL&sortBy=name|createdAt&sortOrder= */
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { page, pageSize, sortBy, sortOrder } = getPageParams(req.query);
    const q = norm(req.query.q);
    const activeParam = req.query.active; // 'true' | 'false' | undefined | 'ALL'
    const withUsage = parseBool(req.query.withUsage);

    const where = {
      companyId,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(
        activeParam === 'true' ? { active: true } :
        activeParam === 'false' ? { active: false } : {}
      ),
    };

    const orderBy = [{ [sortBy]: sortOrder }];
    const [total, itemsRaw] = await Promise.all([
      prisma.paymentMethod.count({ where }),
      prisma.paymentMethod.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    if (!withUsage) {
      return res.status(200).json({ total, page, pageSize, items: itemsRaw });
    }

    const ids = itemsRaw.map(m => m.id);
    const usage = await loadUsageStats(companyId, ids);
    const items = itemsRaw.map(m => {
      const u = usage[m.id] || { payables: 0, receivables: 0 };
      return { ...m, usage: u, canDelete: (u.payables + u.receivables) === 0 };
    });

    return res.status(200).json({ total, page, pageSize, items });
  } catch (e) {
    console.error('Erro list payment methods:', e);
    return res.status(500).json({ message: 'Erro ao listar formas de pagamento.' });
  }
};

/* CREATE */
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = norm(req.body.name);
    const active =
      typeof req.body.active === 'boolean'
        ? req.body.active
        : (req.body.active == null ? true : Boolean(req.body.active));

    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });

    try {
      const created = await prisma.paymentMethod.create({ data: { companyId, name, active } });
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe uma forma de pagamento com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create payment method:', e);
    return res.status(500).json({ message: 'Erro ao criar forma de pagamento.' });
  }
};

/* UPDATE */
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.paymentMethod.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const active =
      req.body.active !== undefined
        ? (typeof req.body.active === 'boolean' ? req.body.active : Boolean(req.body.active))
        : undefined;

    try {
      const updated = await prisma.paymentMethod.update({
        where: { id },
        data: { ...(name !== undefined ? { name } : {}), ...(active !== undefined ? { active } : {}) },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe uma forma de pagamento com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update payment method:', e);
    return res.status(500).json({ message: 'Erro ao atualizar forma de pagamento.' });
  }
};

/* DELETE */
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.paymentMethod.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });

    const [payCount, recCount] = await Promise.all([
      prisma.payable.count({ where: { companyId, paymentMethodId: id } }),
      prisma.receivable.count({ where: { companyId, paymentMethodId: id } }),
    ]);
    if (payCount + recCount > 0) {
      return res.status(409).json({
        message: 'Não é possível excluir: existem lançamentos vinculados a esta forma de pagamento.',
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

/* EXPORT CSV: GET /api/finance/payment-methods/export/csv?q=&active=&sortBy=&sortOrder= */
export const exportCsv = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { sortBy = 'name', sortOrder = 'asc', q, active } = req.query;

    const where = {
      companyId,
      ...(q ? { name: { contains: norm(q), mode: 'insensitive' } } : {}),
      ...(active === 'true' ? { active: true } : {}),
      ...(active === 'false' ? { active: false } : {}),
    };

    const rows = await prisma.paymentMethod.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }],
    });

    const mapped = rows.map(r => ({ name: r.name || '', active: r.active ? 'true' : 'false' }));
    sendCsv(res, 'payment-methods.csv', mapped, ['name','active']);
  } catch (e) {
    console.error('Erro export payment methods csv:', e);
    return res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};
