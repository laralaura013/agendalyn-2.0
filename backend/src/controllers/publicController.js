// src/controllers/publicController.js
import prisma from "../prismaClient.js";
import {
  addMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";
import { sendAppointmentConfirmationEmail } from "../services/emailService.js";

/* -------------------------------------------------------------------------- */
/*                               Helpers de data                              */
/* -------------------------------------------------------------------------- */

// Converte "YYYY-MM-DD" para Date (meia-noite UTC)
function parseDateOnlyUTC(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Limites do dia em UTC
function dayBoundsUTC(dateStr) {
  const start = parseDateOnlyUTC(dateStr);
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

// HH:mm a partir de um Date em UTC
function hhmmUTC(d) {
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                          Dados públicos (Booking)                          */
/* -------------------------------------------------------------------------- */

export const getBookingPageData = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, phone: true, address: true },
    });
    if (!company) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });
    }

    const services = await prisma.service.findMany({
      where: { companyId },
      select: { id: true, name: true, price: true, duration: true },
    });

    const staff = await prisma.user.findMany({
      where: { companyId, showInBooking: true },
      select: { id: true, name: true },
    });

    res.status(200).json({ company, services, staff });
  } catch (error) {
    console.error("--- ERRO AO BUSCAR DADOS PÚBLICOS ---", error);
    res
      .status(500)
      .json({ message: "Erro ao carregar dados da página de agendamento." });
  }
};

/* -------------------------------------------------------------------------- */
/*                     Horários disponíveis (compatível front)                */
/* -------------------------------------------------------------------------- */
/**
 * GET /api/public/available-slots
 * Aceita:
 *  - date (YYYY-MM-DD) obrigatório
 *  - professionalId | userId | staffId (opcional) -> filtra por profissional
 *  - duration (min) | serviceId (opcional) -> define duração do slot
 * Responde: ["HH:mm", ...]
 *
 * Observações:
 * - Trata tudo em UTC para evitar desvios de fuso/hosting.
 * - Considera workSchedule do profissional (se existir).
 * - Respeita bloqueios (company e/ou por profissional).
 * - Ignora agendamentos com status CANCELED.
 * - Em falhas previsíveis retorna [] para não quebrar o front.
 */
export const getAvailableSlots = async (req, res) => {
  const t0 = Date.now();
  try {
    const { date, duration, serviceId, debug } = req.query;
    const resolvedUserId =
      req.query.userId || req.query.professionalId || req.query.staffId || null;

    if (!date) {
      console.warn("[available-slots] missing date");
      return res
        .status(400)
        .json({ message: 'Parâmetro "date" é obrigatório (YYYY-MM-DD).' });
    }

    // Duração do slot (min)
    let slotMinutes = Number(duration) || 0;
    if (!slotMinutes && serviceId) {
      try {
        const svc = await prisma.service.findFirst({ where: { id: serviceId } });
        slotMinutes = Number(svc?.duration) || 30;
      } catch (e) {
        console.warn(
          "[available-slots] erro ao obter service.duration:",
          e?.message
        );
        slotMinutes = 30;
      }
    }
    if (!slotMinutes) slotMinutes = 30;

    // Janela do dia (UTC)
    const { start: dayStartUTC, end: dayEndUTC } = dayBoundsUTC(date);

    // Work schedule (default 09:00–18:00)
    let open = "09:00";
    let close = "18:00";
    const wsDayKey = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][dayStartUTC.getUTCDay()];

    if (resolvedUserId) {
      try {
        const user = await prisma.user.findFirst({
          where: { id: resolvedUserId },
          select: { workSchedule: true, name: true },
        });
        const ws = user?.workSchedule || null;
        const cfg = ws ? ws[wsDayKey] : null;
        const disabled = cfg && (cfg.active === false || cfg.enabled === false);
        if (disabled) {
          if (debug)
            return res.json({
              slots: [],
              meta: { reason: "workSchedule disabled", day: wsDayKey },
            });
          return res.json([]);
        }
        if (cfg) {
          if (cfg.start) open = cfg.start;
          if (cfg.end) close = cfg.end;
        }
      } catch (e) {
        console.warn(
          "[available-slots] erro ao carregar workSchedule:",
          e?.message
        );
      }
    }

    // Janela de trabalho (UTC)
    const [oh, om] = open.split(":").map(Number);
    const [ch, cm] = close.split(":").map(Number);
    const windowStartUTC = new Date(dayStartUTC);
    windowStartUTC.setUTCHours(oh, om, 0, 0);
    const windowEndUTC = new Date(dayStartUTC);
    windowEndUTC.setUTCHours(ch, cm, 0, 0);
    if (!isBefore(windowStartUTC, windowEndUTC)) {
      if (debug)
        return res.json({
          slots: [],
          meta: { reason: "invalid window", open, close, day: wsDayKey },
        });
      return res.json([]);
    }

    // Bloqueios do dia (company e/ou profissional)
    let blocks = [];
    try {
      blocks = await prisma.scheduleBlock.findMany({
        where: {
          date: parseDateOnlyUTC(date), // igualdade exata na meia-noite UTC
          OR: [
            resolvedUserId ? { professionalId: resolvedUserId } : undefined,
            { professionalId: null },
          ].filter(Boolean),
        },
        select: { startTime: true, endTime: true },
        orderBy: [{ startTime: "asc" }],
      });
    } catch (e) {
      console.warn(
        "[available-slots] erro ao consultar scheduleBlock:",
        e?.message
      );
      blocks = [];
    }

    // Agendamentos do dia (não cancelados)
    let appointments = [];
    try {
      appointments = await prisma.appointment.findMany({
        where: {
          start: { gte: dayStartUTC, lte: dayEndUTC },
          ...(resolvedUserId ? { userId: resolvedUserId } : {}),
          status: { not: "CANCELED" },
        },
        select: { start: true, end: true },
      });
    } catch (e) {
      console.warn(
        "[available-slots] erro ao consultar appointments:",
        e?.message
      );
      appointments = [];
    }

    // Geração de slots
    const slots = [];
    for (
      let s = new Date(windowStartUTC);
      isBefore(s, windowEndUTC);
      s = new Date(s.getTime() + slotMinutes * 60000)
    ) {
      const e = new Date(s.getTime() + slotMinutes * 60000);
      if (isAfter(e, windowEndUTC)) break;

      // Conflito com bloqueios (compara HH:mm)
      const sHH = hhmmUTC(s);
      const eHH = hhmmUTC(e);
      const blocked = blocks.some((b) => b.startTime < eHH && b.endTime > sHH);
      if (blocked) continue;

      // Conflito com agendamentos (intervalo real)
      const overlap = appointments.some((a) => s < a.end && e > a.start);
      if (overlap) continue;

      slots.push(hhmmUTC(s)); // retorna "HH:mm"
    }

    console.log("[available-slots]", {
      date,
      user: resolvedUserId,
      open,
      close,
      slotMinutes,
      blocks: blocks.length,
      appts: appointments.length,
      slots: slots.length,
      ms: Date.now() - t0,
    });

    if (debug) {
      return res.json({
        slots,
        meta: {
          date,
          userId: resolvedUserId,
          open,
          close,
          slotMinutes,
          blocks: blocks.length,
          appointments: appointments.length,
          ms: Date.now() - t0,
        },
      });
    }

    return res.json(slots);
  } catch (err) {
    console.error("[available-slots] fatal error:", err);
    // Nunca quebra o front:
    return res.json([]);
  }
};

/* -------------------------------------------------------------------------- */
/*                       Criação de agendamento público                       */
/* -------------------------------------------------------------------------- */
/**
 * POST /api/public/create-appointment
 * Body (novo padrão):
 *  - companyId, serviceId (obrigatórios)
 *  - staffId | professionalId | userId (obrigatório)
 *  - date: "YYYY-MM-DD" (obrigatório)
 *  - slotTime: "HH:mm" (obrigatório)
 *  - clientName, clientPhone?, clientEmail?, clientId?
 *
 * Retrocompatível:
 *  - slotTime como ISO (antigo) => será aceito também.
 */
export const createPublicAppointment = async (req, res) => {
  try {
    const {
      companyId,
      serviceId,
      staffId,
      professionalId,
      userId,
      date,           // "YYYY-MM-DD" (novo)
      slotTime,       // "HH:mm" (novo) ou ISO (antigo)
      clientName,
      clientPhone,
      clientEmail,
      clientId: clientIdRaw,
    } = req.body || {};

    const chosenUserId = userId || professionalId || staffId;

    // validações mínimas
    if (!companyId || !serviceId || !chosenUserId || !clientName) {
      return res.status(400).json({ message: "Dados insuficientes." });
    }
    if (!slotTime) {
      return res.status(400).json({ message: "Horário (slotTime) é obrigatório." });
    }

    // Serviço
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    // Profissional
    const staff = await prisma.user.findUnique({ where: { id: chosenUserId } });
    if (!staff) return res.status(404).json({ message: "Profissional não encontrado." });

    // Monta start/end (UTC) aceitando novo ou antigo formato
    let startDate;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date)) && /^\d{2}:\d{2}$/.test(String(slotTime))) {
      const [hh, mm] = String(slotTime).split(":").map(Number);
      startDate = parseDateOnlyUTC(date); // meia-noite UTC do dia
      startDate.setUTCHours(hh, mm, 0, 0);
    } else {
      // retrocompat: slotTime ISO
      const parsed = parseISO(String(slotTime));
      if (isNaN(parsed)) {
        return res.status(400).json({ message: "Data/horário inválidos." });
      }
      startDate = parsed;
    }

    const endDate = addMinutes(startDate, Number(service.duration) || 30);

    // Cliente (reaproveita por email se existir ou usa clientId)
    let clientId = clientIdRaw || null;
    if (!clientId) {
      let client = null;
      if (clientEmail) {
        client = await prisma.client.findFirst({
          where: { email: { equals: clientEmail, mode: "insensitive" }, companyId },
          select: { id: true, name: true },
        });
      }
      if (!client) {
        const created = await prisma.client.create({
          data: {
            name: clientName,
            phone: clientPhone || "",
            email: clientEmail || null,
            companyId,
          },
          select: { id: true },
        });
        clientId = created.id;
      } else {
        clientId = client.id;
      }
    }

    // Checa bloqueio (usa data só-dia em UTC + HH:mm)
    const dateOnlyUTC = parseDateOnlyUTC(format(startDate, "yyyy-MM-dd"));
    const sHHmm = hhmmUTC(startDate);
    const eHHmm = hhmmUTC(endDate);

    const conflictBlock = await prisma.scheduleBlock.findFirst({
      where: {
        companyId,
        OR: [{ professionalId: chosenUserId }, { professionalId: null }],
        date: dateOnlyUTC,
        startTime: { lt: eHHmm },
        endTime: { gt: sHHmm },
      },
    });
    if (conflictBlock) {
      return res.status(400).json({ message: "Horário indisponível (bloqueio)." });
    }

    // Checa overlap com outros agendamentos (não cancelados)
    const overlap = await prisma.appointment.findFirst({
      where: {
        companyId,
        userId: chosenUserId,
        start: { lt: endDate },
        end: { gt: startDate },
        status: { not: "CANCELED" },
      },
    });
    if (overlap) {
      return res.status(400).json({ message: "Horário já ocupado." });
    }

    // Cria agendamento
    const newAppointment = await prisma.appointment.create({
      data: {
        clientId,
        start: startDate,
        end: endDate,
        notes: "Agendado pelo cliente online",
        companyId,
        serviceId,
        userId: chosenUserId,
        status: "SCHEDULED",
      },
      include: {
        client: true,
        user: true,
        service: true,
      },
    });

    // Email de confirmação (best-effort)
    if (clientEmail) {
      try {
        await sendAppointmentConfirmationEmail({
          toEmail: clientEmail,
          clientName: clientName,
          serviceName: newAppointment.service?.name,
          staffName: newAppointment.user?.name,
          appointmentDate: startDate,
        });
      } catch (e) {
        console.warn("Falha ao enviar e-mail de confirmação:", e?.message);
      }
    }

    return res.status(201).json(newAppointment);
  } catch (error) {
    console.error("--- ERRO AO CRIAR AGENDAMENTO PÚBLICO ---", error);
    return res
      .status(500)
      .json({ message: "Não foi possível confirmar o seu agendamento." });
  }
};
