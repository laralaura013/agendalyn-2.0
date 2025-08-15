// src/controllers/finance/suppliersController.js
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
 * Carrega contagem de uso em payables por supplierId.
 * Retorna: { [supplierId]: number }
 */
async function loadUsageCounts(companyId, supplierIds) {
  if (!supplierIds.length) return {};
  const rows = await prisma.payable.groupBy({
    by: ['supplierId'],
    where: { companyId, supplierId: { in: supplierIds } },
    _count: { _all: true },
  });
  const map = {};
  for (const r of rows) {
    if (r.supplierId) map[r.supplierId] = r._count._all || 0;
  }
  return map;
}

/* ============================================================
 * LIST
 * GET /api/finance/suppliers?q=...&withUsage=1
 * ==========================================================*/
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const q = norm(req.query.q);
    const withUsage = bool(req.query.withUsage);

    const where = { companyId };
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (!withUsage) {
      return res.json(suppliers);
    }

    const ids = suppliers.map((s) => s.id);
    const usageMap = await loadUsageCounts(companyId, ids);

    const enriched = suppliers.map((s) => {
      const payablesCount = usageMap[s.id] || 0;
      const canDelete = payablesCount === 0;
      return { ...s, usage: { payables: payablesCount }, canDelete };
    });

    return res.json(enriched);
  } catch (e) {
    console.error('Erro list suppliers:', e);
    return res.status(500).json({ message: 'Erro ao listar fornecedores.' });
  }
};

/* ============================================================
 * CREATE
 * POST /api/finance/suppliers
 * Body: { name*, taxId?, phone?, email? }
 * Regra: (companyId, name) é único → retorna 409 em conflito.
 * ==========================================================*/
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = norm(req.body.name);
    const taxId = norm(req.body.taxId);
    const phone = norm(req.body.phone);
    const email = norm(req.body.email);

    if (!name) {
      return res.status(400).json({ message: 'name é obrigatório.' });
    }

    try {
      const created = await prisma.supplier.create({
        data: { companyId, name, taxId, phone, email },
      });
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 'P2002') {
        // @@unique([companyId, name])
        return res
          .status(409)
          .json({ message: 'Já existe um fornecedor com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create supplier:', e);
    return res.status(500).json({ message: 'Erro ao criar fornecedor.' });
  }
};

/* ============================================================
 * UPDATE
 * PUT /api/finance/suppliers/:id
 * Body parcial: { name?, taxId?, phone?, email? }
 * Trata conflito único se renomear para um nome já existente.
 * ==========================================================*/
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.supplier.findFirst({
      where: { id, companyId },
    });
    if (!current) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const taxId = req.body.taxId !== undefined ? norm(req.body.taxId) : undefined;
    const phone = req.body.phone !== undefined ? norm(req.body.phone) : undefined;
    const email = req.body.email !== undefined ? norm(req.body.email) : undefined;

    try {
      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(taxId !== undefined ? { taxId } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
        },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res
          .status(409)
          .json({ message: 'Já existe um fornecedor com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update supplier:', e);
    return res.status(500).json({ message: 'Erro ao atualizar fornecedor.' });
  }
};

/* ============================================================
 * DELETE
 * DELETE /api/finance/suppliers/:id
 * Bloqueia exclusão se houver contas a pagar vinculadas.
 * ==========================================================*/
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.supplier.findFirst({
      where: { id, companyId },
    });
    if (!found) {
      return res.status(404).json({ message: 'Fornecedor não encontrado.' });
    }

    const payablesCount = await prisma.payable.count({
      where: { companyId, supplierId: id },
    });

    if (payablesCount > 0) {
      return res.status(409).json({
        message: 'Não é possível excluir o fornecedor: existem contas a pagar vinculadas.',
        usage: { payables: payablesCount },
      });
    }

    await prisma.supplier.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete supplier:', e);
    return res.status(500).json({ message: 'Erro ao excluir fornecedor.' });
  }
};
