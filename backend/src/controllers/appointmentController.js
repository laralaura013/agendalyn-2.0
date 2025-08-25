// src/controllers/appointmentController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/* ======================================================================
 * Helpers
 * ==================================================================== */

/**
 * Lê o payload do JWT (sem verificar assinatura) só para obter companyId
 * quando o middleware ainda não populou req.user/req.companyId.
 */
function readJwtPayload(req) {
  try {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getCompanyId(req) {
  return req.user?.companyId || req.companyId || readJwtPayload(req)?.companyId || null;
}

/**
 * Converte string Date em Date respeitando intenção LOCAL
 * - Se vier com Z/offset: usa como UTC (Date normal).
 * - Se vier SEM Z/offset: remove qualquer sufixo e parseia como LOCAL.
 * (Evita deslocamentos quando o front envia "20:00" pretendendo 20:00 local.)
 */
function toDateFromPossiblyLocalISO(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value);
  const s = String(value);
  const hasTZ = /Z|[+\-]\d{2}:\d{2}$/.test(s);
  if (hasTZ) return new Date(s);
  // remove qualquer eventual sufixo e parseia como local
  const cleaned = s.replace(/\s+/g, '').replace(/(Z|[+\-]\d{2}:\d{2})$/, '');
  return new Date(cleaned);
}

/** Range de um dia LOCAL (00:00:00 → 23:59:59.999) */
function dayRangeLocal(ymd /* 'YYYY-MM-DD' */) {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(`${ymd}T23:59:59.999`);
  return { start, end };
}

/* ======================================================================
 * GET /api/appointments
 * Query: ?date=YYYY-MM-DD | ?date_from & ?date_to | ?professionalId
 * ==================================================================== */
export const listAppointments = async (req, res) => {
  try {
    const { date, date_from, date_to, professionalId } = req.query;

    const where = {};
    const companyId = getCompanyId(req);
    if (companyId) where.companyId = companyId;
    if (professionalId) where.userId = String(professionalId);

    // Data/intervalo em horário LOCAL
    if (date) {
      const { start, end } = dayRangeLocal(String(date));
      where.start = { gte: start, lte: end };
    } else if (date_from || date_to) {
      const from = date_from ? new Date(`${date_from}T00:00:00`) : new Date('1970-01-01T00:00:00');
      const to =
        date_to ? new Date(`${date_to}T23:59:59.999`) : new Date('2999-12-31T23:59:59.999');
      where.start = { gte: from, lte: to };
    }

    // não listar cancelados
    where.status = { notIn: ['CANCELED'] };

    const items = await prisma.appointment.findMany({
      where,
      orderBy: { start: 'asc' },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, duration: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return res.json(items);
  } catch (err) {
    console.error('listAppointments error', err);
    return res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
};

export const getAppointment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const where = { id };
    if (companyId) where.companyId = companyId;

    const item = await prisma.appointment.findFirst({
      where,
      include: { client: true, service: true, user: true },
    });

    if (!item) return res.status(404).json({ message: 'Agendamento não encontrado' });
    return res.json(item);
  } catch (err) {
    console.error('getAppointment error', err);
    return res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    // Se seu schema exige companyId NOT NULL, descomente para forçar:
    // if (!companyId) return res.status(400).json({ message: 'companyId é obrigatório' });

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
    if (missing.length) {
      return res
        .status(400)
        .json({ message: 'Campos obrigatórios faltando', missing });
    }

    const startDate = toDateFromPossiblyLocalISO(start);
    const endDate = toDateFromPossiblyLocalISO(end);
    if (Number.isNaN(+startDate) || Number.isNaN(+endDate)) {
      return res.status(400).json({ message: 'Datas inválidas' });
    }

    // Conflito para o mesmo profissional (overlap)
    const clash = await prisma.appointment.findFirst({
      where: {
        ...(companyId ? { companyId } : {}),
        userId,
        status: { notIn: ['CANCELED'] },
        start: { lt: endDate },
        end: { gt: startDate },
      },
    });
    if (clash) {
      return res
        .status(409)
        .json({ message: 'Conflito de horário para o profissional selecionado.' });
    }

    const created = await prisma.appointment.create({
      data: {
        ...(companyId ? { companyId } : {}),
        clientId,
        serviceId,
        userId,
        start: startDate,
        end: endDate,
        notes: notes || '',
        status,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('createAppointment error', err);
    return res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { id } = req.params;

    const { clientId, serviceId, userId, start, end, notes, status } = req.body;

    const startDate = start ? toDateFromPossiblyLocalISO(start) : undefined;
    const endDate = end ? toDateFromPossiblyLocalISO(end) : undefined;

    // Checa conflito se houver mudança coerente de janela/profissional
    if (userId && startDate && endDate) {
      const clash = await prisma.appointment.findFirst({
        where: {
          ...(companyId ? { companyId } : {}),
          userId,
          id: { not: id },
          status: { notIn: ['CANCELED'] },
          start: { lt: endDate },
          end: { gt: startDate },
        },
      });
      if (clash) {
        return res
          .status(409)
          .json({ message: 'Conflito de horário para o profissional selecionado.' });
      }
    }

    const data = {};
    if (clientId !== undefined) data.clientId = clientId;
    if (serviceId !== undefined) data.serviceId = serviceId;
    if (userId !== undefined) data.userId = userId;
    if (startDate) data.start = startDate;
    if (endDate) data.end = endDate;
    if (typeof notes === 'string') data.notes = notes;
    if (status) data.status = status;

    const updated = await prisma.appointment.update({ where: { id }, data });
    return res.json(updated);
  } catch (err) {
    console.error('updateAppointment error', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    return res.status(500).json({ message: 'Erro ao atualizar agendamento' });
  }
};

export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.appointment.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('deleteAppointment error', err);
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    return res.status(500).json({ message: 'Erro ao excluir agendamento' });
  }
};

/* ======================================================================
 * GET /api/public/available-slots
 * Query: ?date=YYYY-MM-DD&staffId=...&duration=30
 * (Simples; ajuste regras de jornada conforme necessidade.)
 * ==================================================================== */
export const listAvailableSlots = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { date, staffId, duration = 30 } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date é obrigatório (YYYY-MM-DD)' });
    }

    const { start: dayStart, end: dayEnd } = dayRangeLocal(date);

    const where = {
      start: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELED'] },
    };
    if (companyId) where.companyId = companyId;
    if (staffId) where.userId = staffId;

    const appts = await prisma.appointment.findMany({ where, orderBy: { start: 'asc' } });

    // Jornada padrão local 08:00–18:00
    const workStart = new Date(`${date}T08:00:00`);
    const workEnd = new Date(`${date}T18:00:00`);
    const stepMs = Number(duration) * 60 * 1000;

    const slots = [];
    for (let t = +workStart; t + stepMs <= +workEnd; t += stepMs) {
      const s = new Date(t);
      const e = new Date(t + stepMs);
      const clash = appts.some(
        (a) => +new Date(a.start) < +e && +new Date(a.end) > +s
      );
      if (!clash) {
        slots.push(s.toTimeString().substring(0, 5)); // "HH:mm" local
      }
    }

    return res.json(slots);
  } catch (err) {
    console.error('listAvailableSlots error', err);
    return res.status(500).json({ message: 'Erro ao calcular slots' });
  }
};
