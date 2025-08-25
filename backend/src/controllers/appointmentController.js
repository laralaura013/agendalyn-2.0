// src/controllers/appointmentController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/** Helpers de data
 * Front envia ISO (com Z). Guardamos UTC (OK).
 * Para qualquer payload sem timezone (edge cases), tratamos como hora local e convertemos p/ UTC.
 */
function toDateFromPossiblyLocalISO(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  // se vier sem Z/offset, interpretamos como local e deixamos o Date fazer a conversão p/ UTC internamente
  const isOffset = /Z|[+\-]\d{2}:\d{2}$/.test(s);
  return isOffset ? new Date(s) : new Date(s + 'Z'); // fallback seguro
}

function ensureCompanyFilter(where = {}, companyId) {
  return { ...where, companyId };
}

/** GET /appointments
 * Query:
 *  - date (YYYY-MM-DD)  -> dia específico
 *  - date_from & date_to (YYYY-MM-DD) -> intervalo
 *  - professionalId (userId)
 */
export const listAppointments = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId || req.query.companyId;
    if (!companyId) return res.status(400).json({ message: 'companyId é obrigatório' });

    const { date, date_from, date_to, professionalId } = req.query;

    let range = {};
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      range = { gte: start, lte: end };
    } else if (date_from && date_to) {
      const start = new Date(`${date_from}T00:00:00.000Z`);
      const end = new Date(`${date_to}T23:59:59.999Z`);
      range = { gte: start, lte: end };
    }

    const where = ensureCompanyFilter(
      {
        ...(Object.keys(range).length ? { start: range } : {}),
        ...(professionalId ? { userId: professionalId } : {}),
        NOT: { status: { in: ['CANCELED'] } },
      },
      companyId
    );

    const items = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, duration: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ start: 'asc' }],
    });

    res.json(items);
  } catch (err) {
    console.error('listAppointments error', err);
    res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
};

export const getAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId || req.query.companyId;
    const { id } = req.params;
    const item = await prisma.appointment.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        service: true,
        user: true,
      },
    });
    if (!item) return res.status(404).json({ message: 'Agendamento não encontrado' });
    res.json(item);
  } catch (err) {
    console.error('getAppointment error', err);
    res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId || req.body.companyId;
    if (!companyId) return res.status(400).json({ message: 'companyId é obrigatório' });

    const {
      clientId,
      serviceId,
      userId, // profissional
      start,
      end,
      notes,
      status = 'SCHEDULED',
    } = req.body;

    const missing = [];
    if (!clientId) missing.push('clientId');
    if (!serviceId) missing.push('serviceId');
    if (!userId) missing.push('userId');
    if (!start) missing.push('start');
    if (!end) missing.push('end');
    if (missing.length) return res.status(400).json({ message: 'Campos obrigatórios faltando', missing });

    const startDate = toDateFromPossiblyLocalISO(start);
    const endDate = toDateFromPossiblyLocalISO(end);

    // valida conflito básico no mesmo userId
    const clash = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId,
        status: { notIn: ['CANCELED'] },
        // overlap: (start < newEnd) && (end > newStart)
        start: { lt: endDate },
        end: { gt: startDate },
      },
    });
    if (clash) {
      return res.status(409).json({ message: 'Conflito de horário para o profissional selecionado.' });
    }

    const created = await prisma.appointment.create({
      data: {
        companyId,
        clientId,
        serviceId,
        userId,
        start: startDate,
        end: endDate,
        notes: notes || '',
        status,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('createAppointment error', err);
    res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId || req.body.companyId;
    const { id } = req.params;

    const {
      clientId,
      serviceId,
      userId,
      start,
      end,
      notes,
      status,
    } = req.body;

    const startDate = start ? toDateFromPossiblyLocalISO(start) : undefined;
    const endDate = end ? toDateFromPossiblyLocalISO(end) : undefined;

    // opcional: checar conflito se start/end/userId alterarem
    if (startDate && endDate && userId) {
      const clash = await prisma.appointment.findFirst({
        where: {
          companyId,
          userId,
          id: { not: id },
          status: { notIn: ['CANCELED'] },
          start: { lt: endDate },
          end: { gt: startDate },
        },
      });
      if (clash) {
        return res.status(409).json({ message: 'Conflito de horário para o profissional selecionado.' });
      }
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(clientId ? { clientId } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(userId ? { userId } : {}),
        ...(startDate ? { start: startDate } : {}),
        ...(endDate ? { end: endDate } : {}),
        ...(typeof notes === 'string' ? { notes } : {}),
        ...(status ? { status } : {}),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('updateAppointment error', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    res.status(500).json({ message: 'Erro ao atualizar agendamento' });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.appointment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteAppointment error', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    res.status(500).json({ message: 'Erro ao excluir agendamento' });
  }
};

/** Opcional: slots públicos (simples) — ajuste conforme sua regra */
export const listAvailableSlots = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.companyId || req.query.companyId;
    const { date, staffId, duration = 30 } = req.query;
    if (!date) return res.status(400).json({ message: 'date é obrigatório (YYYY-MM-DD)' });

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const where = ensureCompanyFilter(
      {
        start: { gte: dayStart, lte: dayEnd },
        ...(staffId ? { userId: staffId } : {}),
        status: { notIn: ['CANCELED'] },
      },
      companyId
    );

    const appts = await prisma.appointment.findMany({ where, orderBy: [{ start: 'asc' }] });

    // Regra fake de trabalho 08-18
    const workStart = new Date(`${date}T08:00:00.000Z`);
    const workEnd = new Date(`${date}T18:00:00.000Z`);
    const stepMs = Number(duration) * 60 * 1000;

    const slots = [];
    for (let t = +workStart; t + stepMs <= +workEnd; t += stepMs) {
      const s = new Date(t);
      const e = new Date(t + stepMs);
      const clash = appts.some(a => (+new Date(a.start) < +e) && (+new Date(a.end) > +s));
      if (!clash) {
        // devolve em HH:mm no FUSO LOCAL do servidor; o front já lida com exibição
        slots.push(s.toISOString().substring(11, 16)); // "HH:MM"
      }
    }
    res.json(slots);
  } catch (err) {
    console.error('listAvailableSlots error', err);
    res.status(500).json({ message: 'Erro ao calcular slots' });
  }
};
