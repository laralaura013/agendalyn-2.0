// ✅ ARQUIVO: src/controllers/waitlistController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * GET /waitlist
 * Lista todos os registros da empresa logada (req.company.id)
 */
export const listWaitlist = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(401).json({ message: "Empresa não identificada." });

    const items = await prisma.waitlist.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        client: true,
        service: true,
        professional: true,
      },
    });

    res.status(200).json(items);
  } catch (error) {
    console.error("Erro ao listar waitlist:", error);
    res.status(500).json({ message: "Erro interno ao listar a lista de espera." });
  }
};

/**
 * POST /waitlist
 * Cria um registro. Pode enviar clientId OU clientName/phone.
 * Body esperado:
 * {
 *   clientId?: string,
 *   clientName?: string,
 *   phone?: string,
 *   serviceId?: string,
 *   professionalId?: string,
 *   preferredDate?: string (YYYY-MM-DD),
 *   preferredTime?: string (HH:mm),
 *   pref?: string,
 *   notes?: string
 * }
 */
export const createWaitlist = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(401).json({ message: "Empresa não identificada." });

    const {
      clientId,
      clientName,
      phone,
      serviceId,
      professionalId,
      preferredDate,
      preferredTime,
      pref,
      notes,
    } = req.body || {};

    if (!clientId && !clientName && !phone) {
      return res.status(400).json({ message: "Informe clientId ou clientName/phone." });
    }

    // Parse preferredDate
    let preferredDateParsed = null;
    if (preferredDate) {
      const d = new Date(preferredDate);
      if (!isNaN(d.getTime())) preferredDateParsed = d;
    }

    const created = await prisma.waitlist.create({
      data: {
        companyId,
        clientId: clientId || null,
        clientName: clientName || null,
        phone: phone || null,
        serviceId: serviceId || null,
        professionalId: professionalId || null,
        preferredDate: preferredDateParsed,
        preferredTime: preferredTime || null,
        pref: pref || null,
        notes: notes || null,
        status: "WAITING",
      },
      include: {
        client: true,
        service: true,
        professional: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error("Erro ao criar waitlist:", error);
    res.status(500).json({ message: "Erro interno ao criar registro na lista de espera." });
  }
};

/**
 * PUT /waitlist/:id
 * Atualiza campos e/ou status.
 * Body livre com os campos do modelo (validados conforme necessário).
 */
export const updateWaitlist = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(401).json({ message: "Empresa não identificada." });

    const { id } = req.params;
    const {
      clientId,
      clientName,
      phone,
      serviceId,
      professionalId,
      preferredDate,
      preferredTime,
      pref,
      notes,
      status,
    } = req.body || {};

    // Garante que o registro pertence à empresa
    const exists = await prisma.waitlist.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ message: "Registro não encontrado." });

    let preferredDateParsed = undefined;
    if (preferredDate !== undefined) {
      preferredDateParsed = preferredDate ? new Date(preferredDate) : null;
    }

    const updated = await prisma.waitlist.update({
      where: { id },
      data: {
        clientId: clientId ?? undefined,
        clientName: clientName ?? undefined,
        phone: phone ?? undefined,
        serviceId: serviceId ?? undefined,
        professionalId: professionalId ?? undefined,
        preferredDate: preferredDateParsed,
        preferredTime: preferredTime ?? undefined,
        pref: pref ?? undefined,
        notes: notes ?? undefined,
        status: status ?? undefined, // WAITING | NOTIFIED | SCHEDULED | CANCELLED
      },
      include: {
        client: true,
        service: true,
        professional: true,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("Erro ao atualizar waitlist:", error);
    res.status(500).json({ message: "Erro interno ao atualizar a lista de espera." });
  }
};

/**
 * DELETE /waitlist/:id
 * Remove registro da empresa.
 */
export const deleteWaitlist = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(401).json({ message: "Empresa não identificada." });

    const { id } = req.params;

    // Confirma propriedade
    const exists = await prisma.waitlist.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ message: "Registro não encontrado." });

    await prisma.waitlist.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao remover waitlist:", error);
    res.status(500).json({ message: "Erro interno ao remover registro da lista de espera." });
  }
};

/**
 * POST /waitlist/:id/notify
 * Marca como NOTIFIED e (opcional) dispara notificação (e-mail/SMS).
 * Aqui deixo a integração opcional com RESEND (e-mail) — se não houver e-mail, apenas marca status.
 */
export const notifyWaitlist = async (req, res) => {
  try {
    const companyId = req.company?.id;
    if (!companyId) return res.status(401).json({ message: "Empresa não identificada." });

    const { id } = req.params;

    const item = await prisma.waitlist.findFirst({
      where: { id, companyId },
      include: { client: true },
    });
    if (!item) return res.status(404).json({ message: "Registro não encontrado." });

    // TODO: opcional — enviar e-mail/SMS.
    // Exemplo (pseudo):
    // if (process.env.RESEND_API_KEY && (item.client?.email || item.email)) {
    //   await sendEmail(item.client?.email || item.email, ...);
    // }

    const updated = await prisma.waitlist.update({
      where: { id },
      data: { status: "NOTIFIED" },
    });

    res.status(200).json({ message: "Cliente notificado (status atualizado).", item: updated });
  } catch (error) {
    console.error("Erro ao notificar waitlist:", error);
    res.status(500).json({ message: "Erro interno ao notificar cliente da lista de espera." });
  }
};
