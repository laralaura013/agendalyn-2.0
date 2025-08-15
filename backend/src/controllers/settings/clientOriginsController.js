import prisma from '../../prismaClient.js';

const norm = (s) => (typeof s === 'string' ? s.trim() : s);
const bool = (v) => ['1','true','yes'].includes(String(v||'').toLowerCase());

/** GET /api/settings/client-origins?q=&withUsage=1 */
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const q = norm(req.query.q);
    const withUsage = bool(req.query.withUsage);

    const where = { companyId };
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const rows = await prisma.clientOrigin.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    if (!withUsage) return res.json(rows);

    const ids = rows.map(r => r.id);
    const usage = await prisma.client.count({
      where: { companyId, originId: { in: ids } }
    });

    // Para detalhar por origem:
    const perOrigin = await prisma.client.groupBy({
      by: ['originId'],
      where: { companyId, originId: { in: ids } },
      _count: { _all: true }
    });
    const map = Object.fromEntries(perOrigin.map(u => [u.originId, u._count._all]));

    const enriched = rows.map(r => {
      const count = map[r.id] || 0;
      return { ...r, usage: { clients: count }, canDelete: count === 0 };
    });
    return res.json(enriched);
  } catch (e) {
    console.error('Erro list client origins:', e);
    return res.status(500).json({ message: 'Erro ao listar origens de cliente.' });
  }
};

export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = norm(req.body.name);
    const active = req.body.active === undefined ? true : !!req.body.active;

    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });

    try {
      const row = await prisma.clientOrigin.create({
        data: { companyId, name, active },
      });
      return res.status(201).json(row);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe uma origem com esse nome.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create client origin:', e);
    return res.status(500).json({ message: 'Erro ao criar origem de cliente.' });
  }
};

export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.clientOrigin.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Origem não encontrada.' });

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const active = req.body.active !== undefined ? !!req.body.active : undefined;

    try {
      const updated = await prisma.clientOrigin.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe uma origem com esse nome.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update client origin:', e);
    return res.status(500).json({ message: 'Erro ao atualizar origem de cliente.' });
  }
};

export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.clientOrigin.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Origem não encontrada.' });

    const inUse = await prisma.client.count({ where: { companyId, originId: id } });
    if (inUse > 0) {
      return res.status(409).json({
        message: 'Não é possível excluir: existem clientes vinculados a esta origem.',
        usage: { clients: inUse }
      });
    }

    await prisma.clientOrigin.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete client origin:', e);
    return res.status(500).json({ message: 'Erro ao excluir origem de cliente.' });
  }
};
