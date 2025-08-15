import prisma from '../../prismaClient.js';

const norm = (s) => (typeof s === 'string' ? s.trim() : s);
const bool = (v) => ['1','true','yes'].includes(String(v||'').toLowerCase());

/** GET /api/settings/cancellation-reasons?q=&withUsage=1 */
export const list = async (req, res) => {
  try {
    const companyId = req.company.id;
    const q = norm(req.query.q);
    const withUsage = bool(req.query.withUsage);

    const where = { companyId };
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const rows = await prisma.cancellationReason.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    if (!withUsage) return res.json(rows);

    const ids = rows.map(r => r.id);
    const usage = await prisma.appointment.groupBy({
      by: ['cancelReasonId'],
      where: { companyId, cancelReasonId: { in: ids } },
      _count: { _all: true }
    });
    const map = Object.fromEntries(usage.map(u => [u.cancelReasonId, u._count._all]));

    const enriched = rows.map(r => {
      const used = map[r.id] || 0;
      return { ...r, usage: { appointments: used }, canDelete: used === 0 };
    });
    return res.json(enriched);
  } catch (e) {
    console.error('Erro list cancellation reasons:', e);
    return res.status(500).json({ message: 'Erro ao listar motivos de cancelamento.' });
  }
};

export const create = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = norm(req.body.name);
    const active = req.body.active === undefined ? true : !!req.body.active;

    if (!name) return res.status(400).json({ message: 'name é obrigatório.' });

    try {
      const row = await prisma.cancellationReason.create({
        data: { companyId, name, active }
      });
      return res.status(201).json(row);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe um motivo com esse nome.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro create cancellation reason:', e);
    return res.status(500).json({ message: 'Erro ao criar motivo de cancelamento.' });
  }
};

export const update = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const current = await prisma.cancellationReason.findFirst({ where: { id, companyId } });
    if (!current) return res.status(404).json({ message: 'Motivo não encontrado.' });

    const name = req.body.name !== undefined ? norm(req.body.name) : undefined;
    const active = req.body.active !== undefined ? !!req.body.active : undefined;

    try {
      const updated = await prisma.cancellationReason.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      });
      return res.json(updated);
    } catch (e) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ message: 'Já existe um motivo com esse nome.' });
      }
      throw e;
    }
  } catch (e) {
    console.error('Erro update cancellation reason:', e);
    return res.status(500).json({ message: 'Erro ao atualizar motivo de cancelamento.' });
  }
};

export const remove = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const found = await prisma.cancellationReason.findFirst({ where: { id, companyId } });
    if (!found) return res.status(404).json({ message: 'Motivo não encontrado.' });

    const used = await prisma.appointment.count({ where: { companyId, cancelReasonId: id } });
    if (used > 0) {
      return res.status(409).json({
        message: 'Não é possível excluir: existem agendamentos vinculados a este motivo.',
        usage: { appointments: used }
      });
    }

    await prisma.cancellationReason.delete({ where: { id } });
    return res.status(204).send();
  } catch (e) {
    console.error('Erro delete cancellation reason:', e);
    return res.status(500).json({ message: 'Erro ao excluir motivo de cancelamento.' });
  }
};
