// src/controllers/finance/suppliersController.js
import prisma from '../../prismaClient.js';
import { norm, parseBool, getPageParams, sendCsv } from './_shared.js';

/** Helpers locais */
const toNullIfEmpty = (v) => (v === '' || v == null ? null : v);
const allowSort = (key, allowed, fallback) =>
  allowed.includes(String(key)) ? String(key) : fallback;

/** contagem de uso em payables por supplierId */
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

/* LIST: GET /api/finance/suppliers?page=&pageSize=&q=&sortBy=name|createdAt&sortOrder=asc|desc&withUsage=1 */
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { page, pageSize, sortBy: sortByRaw, sortOrder: sortOrderRaw } = getPageParams(req.query);
    const q = norm(req.query.q);
    const withUsage = parseBool(req.query.withUsage);

    const sortBy = allowSort(sortByRaw, ['name', 'createdAt'], 'name');
    const sortOrder = String(sortOrderRaw).toLowerCase() === 'desc' ? 'desc' : 'asc';

    const where = {
      companyId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { taxId: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = [{ [sortBy]: sortOrder }];
    const [total, itemsRaw] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    if (!withUsage) {
      return res.status(200).json({ total, page, pageSize, items: itemsRaw });
    }

    const ids = itemsRaw.map((s) => s.id);
    const usageMap = await loadUsageCounts(companyId, ids);
    const items = itemsRaw.map((s) => {
      const payablesCount = usageMap[s.id] || 0;
      return { ...s, usage: { payables: payablesCount }, canDelete: payablesCount === 0 };
    });

    return res.status(200).json({ total, page, pageSize, items });
  } catch (e) {
    console.error('Erro list suppliers:', e);
    return res.status(500).json({ message: 'Erro ao listar fornecedores.' });
  }
};

/* CREATE: POST /api/finance/suppliers */
export const create = async (req, res) => {
  try {
    const companyId = req.company.id;

    const name = norm(req.body.name);
    const taxId = toNullIfEmpty(norm(req.body.taxId));
    const phone = toNullIfEmpty(norm(req.body.phone));
    const email = toNullIfEmpty(norm(req.body.email));

    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });

    try {
      const created = await prisma.supplier.create({
        data: {
          companyId,
          name,
          taxId,
          phone,
          email,
          // HOTFIX para bancos que exigem NOT NULL em updatedAt
          updatedAt: new Date(),
        },
      });
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === 'P2002') {
        // unique constraint (ex.: companyId+name)
        return res.status(409).json({ message: 'Já existe um fornecedor com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create supplier:', e);
    return res.status(500).json({ message: 'Erro ao criar fornecedor.' });
  }
};

/* UPDATE: PUT /api/finance/suppliers/:id */
export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.supplier.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    const nameRaw = req.body.name;
    const taxIdRaw = req.body.taxId;
    const phoneRaw = req.body.phone;
    const emailRaw = req.body.email;

    const name = nameRaw !== undefined ? norm(nameRaw) : undefined;
    const taxId = taxIdRaw !== undefined ? toNullIfEmpty(norm(taxIdRaw)) : undefined;
    const phone = phoneRaw !== undefined ? toNullIfEmpty(norm(phoneRaw)) : undefined;
    const email = emailRaw !== undefined ? toNullIfEmpty(norm(emailRaw)) : undefined;

    if (name !== undefined && !name) {
      return res.status(400).json({ message: 'name não pode ser vazio.' });
    }

    try {
      const updated = await prisma.supplier.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(taxId !== undefined ? { taxId } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(email !== undefined ? { email } : {}),
          // Mantém updatedAt sempre atualizado mesmo sem @updatedAt no schema
          updatedAt: new Date(),
        },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe um fornecedor com esse nome nesta empresa.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update supplier:', e);
    return res.status(500).json({ message: 'Erro ao atualizar fornecedor.' });
  }
};

/* DELETE: DELETE /api/finance/suppliers/:id */
export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.supplier.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Fornecedor não encontrado.' });

    const payablesCount = await prisma.payable.count({ where: { companyId, supplierId: id } });
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

/* EXPORT CSV: GET /api/finance/suppliers/export/csv?q=&sortBy=&sortOrder= */
export const exportCsv = async (req, res) => {
  try {
    const companyId = req.company.id;
    const sortBy = allowSort(req.query.sortBy || 'name', ['name', 'createdAt'], 'name');
    const sortOrder = String(req.query.sortOrder).toLowerCase() === 'desc' ? 'desc' : 'asc';
    const q = norm(req.query.q);

    const where = {
      companyId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { taxId: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await prisma.supplier.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder }],
    });

    const mapped = rows.map((r) => ({
      name: r.name || '',
      taxId: r.taxId || '',
      phone: r.phone || '',
      email: r.email || '',
      createdAt: r.createdAt?.toISOString() ?? '',
    }));

    sendCsv(res, 'suppliers.csv', mapped, ['name', 'taxId', 'phone', 'email', 'createdAt']);
  } catch (e) {
    console.error('Erro export suppliers csv:', e);
    return res.status(500).json({ message: 'Erro ao exportar CSV.' });
  }
};
