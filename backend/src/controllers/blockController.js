import prisma from "../prismaClient.js";

// "YYYY-MM-DD" -> Date UTC 00:00
function parseDateOnly(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/**
 * GET /api/agenda/blocks
 * Query:
 *  - professionalId (opcional)
 *  - date=YYYY-MM-DD (um dia)
 *  - OU date_from=YYYY-MM-DD & date_to=YYYY-MM-DD (intervalo)
 */
export async function listBlocks(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    if (!companyId) return res.status(400).json({ message: "Empresa não identificada." });

    const { date, professionalId, date_from, date_to } = req.query;

    const where = { companyId };
    if (professionalId) where.professionalId = String(professionalId);

    if (date) {
      where.date = parseDateOnly(date);
    } else if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = parseDateOnly(date_from);
      if (date_to) where.date.lte = parseDateOnly(date_to);
    }

    const blocks = await prisma.scheduleBlock.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { professional: { select: { id: true, name: true } } },
    });

    return res.json(blocks);
  } catch (err) {
    console.error("listBlocks error:", err);
    return res.status(500).json({ message: "Erro ao listar bloqueios." });
  }
}

/**
 * POST /api/agenda/blocks
 * body: { professionalId?, date: "YYYY-MM-DD", start: "HH:mm", end: "HH:mm", reason? }
 */
export async function createBlock(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    if (!companyId) return res.status(400).json({ message: "Empresa não identificada." });

    const { professionalId, date, start, end, reason } = req.body;

    if (!date || !start || !end) {
      return res.status(400).json({ message: "Campos obrigatórios: date, start, end." });
    }

    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(start) || !hhmm.test(end)) {
      return res.status(400).json({ message: "Horário inválido. Use HH:mm." });
    }
    if (start >= end) {
      return res.status(400).json({ message: "Horário inicial deve ser menor que o final." });
    }

    const created = await prisma.scheduleBlock.create({
      data: {
        companyId,
        professionalId: professionalId || null,
        date: parseDateOnly(date),
        startTime: start,
        endTime: end,
        reason: reason || null,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("createBlock error:", err);
    return res.status(500).json({ message: "Erro ao criar bloqueio." });
  }
}

/**
 * DELETE /api/agenda/blocks/:id
 */
export async function deleteBlock(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    if (!companyId) return res.status(400).json({ message: "Empresa não identificada." });

    const { id } = req.params;

    const block = await prisma.scheduleBlock.findFirst({ where: { id, companyId } });
    if (!block) return res.status(404).json({ message: "Bloqueio não encontrado." });

    await prisma.scheduleBlock.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("deleteBlock error:", err);
    return res.status(500).json({ message: "Erro ao excluir bloqueio." });
  }
}
