import prisma from "../prismaClient.js";

// Converte string "YYYY-MM-DD" para Date UTC
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
      include: {
        professional: {
          select: { id: true, name: true },
        },
      },
    });

    return res.json(blocks);
  } catch (err) {
    console.error("listBlocks error:", err);
    return res.status(500).json({ message: "Erro ao listar bloqueios." });
  }
}

/**
 * POST /api/agenda/blocks
 * Body: { professionalId?, date: "YYYY-MM-DD", start/startTime: "HH:mm", end/endTime: "HH:mm", reason? }
 */
export async function createBlock(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    if (!companyId) return res.status(400).json({ message: "Empresa não identificada." });

    const {
      professionalId,
      date,
      start,
      startTime,
      end,
      endTime,
      reason,
    } = req.body;

    const finalStart = start || startTime;
    const finalEnd = end || endTime;

    if (!date || !finalStart || !finalEnd) {
      return res.status(400).json({
        message: "Campos obrigatórios: date, start/end.",
        required: ["date", "start", "end"],
      });
    }

    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(finalStart) || !hhmm.test(finalEnd)) {
      return res.status(400).json({ message: "Horário inválido. Use o formato HH:mm." });
    }

    if (finalStart >= finalEnd) {
      return res.status(400).json({
        message: "Horário inicial deve ser menor que o final.",
        start: finalStart,
        end: finalEnd,
      });
    }

    const created = await prisma.scheduleBlock.create({
      data: {
        companyId,
        professionalId: professionalId || null,
        date: parseDateOnly(date),
        startTime: finalStart,
        endTime: finalEnd,
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

    const block = await prisma.scheduleBlock.findFirst({
      where: { id, companyId },
    });

    if (!block) {
      return res.status(404).json({ message: "Bloqueio não encontrado." });
    }

    await prisma.scheduleBlock.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (err) {
    console.error("deleteBlock error:", err);
    return res.status(500).json({ message: "Erro ao excluir bloqueio." });
  }
}
