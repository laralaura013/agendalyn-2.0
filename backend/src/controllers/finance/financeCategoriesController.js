// src/controllers/finance/financeCategoriesController.js
import prisma from '../../prismaClient.js';
import { norm, parseBool, getPageParams, sendCsv } from './_shared.js';

const VALID_TYPES = new Set(['PAYABLE', 'RECEIVABLE']);

/** contagens de uso por categoryId */
async function loadUsageStats(companyId, ids) {
  if (!ids.length) return {};
  const [pay, rec] = await Promise.all([
    prisma.payable.groupBy({
      by: ['categoryId'],
      where: { companyId, categoryId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.receivable.groupBy({
      by: ['categoryId'],
      where: { companyId, categoryId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const map = {};
  for (const r of pay) {
    if (!r.categoryId) continue;
    map[r.categoryId] = map[r.categoryId] || { payables: 0, receivables: 0 };
    map[r.categoryId].payables = r._count._all || 0;
  }
  for (const r of rec) {
    if (!r.categoryId) continue;
    map[r.categoryId] = map[r.categoryId] || { payables: 0, receivables: 0 };
    map[r.categoryId].receivables = r._count._all || 0;
  }
  return map;
}

/* LIST: GET /api/finance/categories?page=&pageSize=&q=&type=PAYABLE|RECEIVABLE&sortBy=name|createdAt&sortOrder= */
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { page, pageSize, sortBy, sortOrder } = getPageParams(req.query);
    const q = norm(req.query.q);
    const type = norm(req.query.type);
    const withUsage = parseBool(req.query.withUsage);

    const where = {
      companyId,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(VALID_TYPES.has(type) ? { type } : {}),
    };

    const orderBy = [{ [sortBy]: sortOrder }];
    const [total, itemsRaw] = await Promise.all([
      prisma.financeCategory.count({ where }),
      prisma.financeCategory.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    if (!withUsage) {
      return res.status(200).json({ total, page, pageSize, items: itemsRaw });
    }

    const ids = itemsRaw.map(c => c.id);
    const usage = await loadUsageStats(companyId, ids);
    const items = itemsRaw.map(c => {
      const u = usage[c.id] || { payables: 0, receivables: 0 };
      return { ...c, usage: u, canDelete: (u.payables + u.receivables) === 0 };
    });

    return res.status(200).json({ total, page, pageSize, items });
  } catch (e) {
    console.error('Erro list categories:', e);
    return res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
};

/* CREATE: POST /api/finance/categories { name*, type* } */
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = norm(req.body.name);
    const type = norm(req.body.type);

    if (!name || !type) {
      return res.status(400).json({ message: 'Campos obrigatórios: name e type.' });
    }
    if (!VALID_TYPES.has(type)) {
      return res.status(400).json({ message: 'type inválido. Use PAYABLE ou RECEIVABLE.' });
    }

    try {
      const created = await prisma.financeCategory.create({ data: { companyId, name, type } });
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe uma categoria com esse nome e tipo nessa empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create category:', e);
    return res.status(500).json({ message: 'Erro ao criar categoria.' });
  }
};

/* UPDATE: PUT /api/finance/categories/:id { name?, type? } */
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.financeCategory.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Categoria não encontrada.' });

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const type = req.body.type !== undefined ? norm(req.body.type) : undefined;

    if (type !== undefined && !VALID_TYPES.has(type)) {
      return res.status(400).json({ message: 'type inválido. Use PAYABLE ou RECEIVABLE.' });
    }

    // Se tentar alterar TYPE e houver vínculos, bloqueia
    if (type !== undefined && type !== current.type) {
      const [payCount, recCount] = await Promise.all([
        prisma.payable.count({ where: { companyId, categoryId: id } }),
        prisma.receivable.count({ where: { companyId, categoryId: id } }),
      ]);
      if (payCount + recCount > 0) {
        return res.status(409).json({
          message: 'Não é possível alterar o tipo de uma categoria que já possui lançamentos vinculados.',
          usage: { payables: payCount, receivables: recCount },
        });
      }
    }

    try {
      const updated = await prisma.financeCategory.update({
        where: { id },
        data: { ...(name !== undefined ? { name } : {}), ...(type !== undefined ? { type } : {}) },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe uma categoria com esse nome e tipo nessa empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update category:', e);
    return res.status(500).json({ message: 'Erro ao atualizar categoria.' });
  }
};

/* DELETE */
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.financeCategory.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Categoria não encontrada.' });

    const [payCount, recCount] = await Promise.all([
      prisma.payable.count({ where: { companyId, categoryId: id } }),
      prisma.receivable.count({ where: { companyId, categoryId: id } }),
    ]);
    if (payCount + recCount > 0) {
      return res.status(409).json({
        message: 'Não é possível excluir a categoria. Existem lançamentos vinculados a ela.',
        usage: { payables: payCount, receivables: recCount },
      });
    }

    await prisma.financeCategory.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete category:', e);
    return res.status(500).json({ message: 'Erro ao excluir categoria.' });
  }
};

/* EXPORT CSV: GET /api/finance/categories/export/csv?q=&type=&sortBy=&sortOrder= */
export const exportCsv = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { sortBy = 'name', sortOrder = 'asc', q, type } = req.query;

    const where = {
      companyId,
      ...(q ? { name: { contains: norm(q), mode: 'insensitive' } } : {}),
      ...(VALID_TYPES.has(norm(type)) ? { type: norm(type) } : {}),
    };

    const rows = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' }],
    });

    const mapped = rows.map(r => ({ name: r.name || '', type: r.type || '' }));
    sendCsv(res, 'finance-categories.csv', mapped, ['name','type']);
  } catch (e) {
    console.error('Erro export categories csv:', e);
    return res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};
