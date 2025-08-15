// src/controllers/finance/financeCategoriesController.js
import prisma from '../../prismaClient.js';

/* ========================= Helpers ========================= */
const VALID_TYPES = new Set(['PAYABLE', 'RECEIVABLE']);
const bool = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v || '').toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
};
const norm = (s) => (typeof s === 'string' ? s.trim() : s);

/**
 * Carrega contagens de uso (payables e receivables) por categoryId.
 * Retorna: { [categoryId]: { payables: number, receivables: number } }
 */
async function loadUsageStats(companyId, categoryIds) {
  if (!categoryIds.length) return {};

  const [pay, rec] = await Promise.all([
    prisma.payable.groupBy({
      by: ['categoryId'],
      where: { companyId, categoryId: { in: categoryIds } },
      _count: { _all: true },
    }),
    prisma.receivable.groupBy({
      by: ['categoryId'],
      where: { companyId, categoryId: { in: categoryIds } },
      _count: { _all: true },
    }),
  ]);

  const map = {};
  for (const row of pay) {
    map[row.categoryId] = map[row.categoryId] || { payables: 0, receivables: 0 };
    map[row.categoryId].payables = row._count._all || 0;
  }
  for (const row of rec) {
    map[row.categoryId] = map[row.categoryId] || { payables: 0, receivables: 0 };
    map[row.categoryId].receivables = row._count._all || 0;
  }
  return map;
}

/* ============================================================
 * LIST
 * GET /api/finance/categories?type=PAYABLE|RECEIVABLE&q=...&withUsage=1
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const type = norm(req.query.type);
    const q = norm(req.query.q);
    const withUsage = bool(req.query.withUsage);

    const where = { companyId };
    if (type) where.type = type;
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const categories = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    if (!withUsage) {
      return res.json(categories);
    }

    // Acrescenta stats de uso e canDelete
    const ids = categories.map((c) => c.id);
    const usage = await loadUsageStats(companyId, ids);

    const enriched = categories.map((c) => {
      const u = usage[c.id] || { payables: 0, receivables: 0 };
      const canDelete = (u.payables + u.receivables) === 0;
      return { ...c, usage: u, canDelete };
    });

    return res.json(enriched);
  } catch (e) {
    console.error('Erro list categories:', e);
    return res.status(500).json({ message: 'Erro ao listar categorias.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/categories
 * Body: { name*, type* }  (type: PAYABLE|RECEIVABLE)
 * ==========================================================*/
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
      const created = await prisma.financeCategory.create({
        data: { companyId, name, type },
      });
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 'P2002') {
        // unique (companyId, name, type)
        return res
          .status(409)
          .json({ message: 'Já existe uma categoria com esse nome e tipo nessa empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create category:', e);
    return res.status(500).json({ message: 'Erro ao criar categoria.' });
  }
};

/* ============================================================
 * UPDATE
 * PUT /api/finance/categories/:id
 * Body parcial: { name?, type? }
 * Regras:
 *  - type só pode ser alterado se NÃO houver payables/receivables vinculados.
 *  - Trata conflito único (companyId, name, type).
 * ==========================================================*/
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.financeCategory.findFirst({
      where: { id, companyId },
    });
    if (!current) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const type = req.body.type !== undefined ? norm(req.body.type) : undefined;

    if (type !== undefined && !VALID_TYPES.has(type)) {
      return res.status(400).json({ message: 'type inválido. Use PAYABLE ou RECEIVABLE.' });
    }

    // Se tentar alterar o TYPE e a categoria estiver em uso, bloqueia.
    if (type !== undefined && type !== current.type) {
      const [payCount, recCount] = await Promise.all([
        prisma.payable.count({ where: { companyId, categoryId: id } }),
        prisma.receivable.count({ where: { companyId, categoryId: id } }),
      ]);
      if (payCount + recCount > 0) {
        return res.status(409).json({
          message:
            'Não é possível alterar o tipo de uma categoria que já possui lançamentos vinculados.',
          usage: { payables: payCount, receivables: recCount },
        });
      }
    }

    try {
      const updated = await prisma.financeCategory.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(type !== undefined ? { type } : {}),
        },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res
          .status(409)
          .json({ message: 'Já existe uma categoria com esse nome e tipo nessa empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update category:', e);
    return res.status(500).json({ message: 'Erro ao atualizar categoria.' });
  }
};

/* ============================================================
 * DELETE
 * DELETE /api/finance/categories/:id
 * Bloqueia exclusão se houver vínculos.
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.financeCategory.findFirst({
      where: { id, companyId },
    });
    if (!found) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    const [payCount, recCount] = await Promise.all([
      prisma.payable.count({ where: { companyId, categoryId: id } }),
      prisma.receivable.count({ where: { companyId, categoryId: id } }),
    ]);

    if (payCount + recCount > 0) {
      return res.status(409).json({
        message:
          'Não é possível excluir a categoria. Existem lançamentos vinculados a ela.',
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
