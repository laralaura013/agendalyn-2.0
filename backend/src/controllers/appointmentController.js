// src/controllers/appointmentController.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Utils
 * ------------------------------------------------------------------ */

/** yyyy-mm-dd -> { start: Date at 00:00, end: Date at 23:59:59.999 }  (em local time) */
function dayBounds(ymd) {
  const [y, m, d] = String(ymd).split('-').map(n => parseInt(n, 10))
  const start = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
  const end   = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
  return { start, end }
}

/** yyyy-mm-dd -> Date local 00:00 */
function atStartOfDay(ymd) {
  const [y, m, d] = String(ymd).split('-').map(n => parseInt(n, 10))
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
}

/** yyyy-mm-dd -> Date local 23:59:59.999 */
function atEndOfDay(ymd) {
  const [y, m, d] = String(ymd).split('-').map(n => parseInt(n, 10))
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
}

/**
 * Se vier string ISO com Z (UTC), o Date já fica correto. Se vier "YYYY-MM-DDTHH:mm"
 * tratamos como horário LOCAL (sem aplicar fuso na criação).
 */
function parseAsLocalOrIso(value) {
  if (value instanceof Date) return value
  if (typeof value !== 'string') return new Date(value)
  // ISO completo? deixa o JS tratar
  if (/\dT\d/.test(value) && /Z|[+\-]\d{2}:\d{2}$/.test(value)) return new Date(value)
  // "YYYY-MM-DDTHH:mm" (sem Z) -> criar como local
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [datePart, timePart] = value.split('T')
    const [y, m, d] = datePart.split('-').map(n => parseInt(n, 10))
    const [hh, mm = '0', ss = '0'] = timePart.split(':')
    return new Date(y, (m || 1) - 1, d || 1, parseInt(hh,10) || 0, parseInt(mm,10) || 0, parseInt(ss,10) || 0, 0)
  }
  // "YYYY-MM-DD" -> começo do dia local
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return atStartOfDay(value)
  return new Date(value)
}

/** Inclui relações padrão para o front */
const defaultInclude = {
  client:  { select: { id: true, name: true, phone: true, avatarUrl: true } },
  service: { select: { id: true, name: true, duration: true, price: true } },
  user:    { select: { id: true, name: true, nickname: true, role: true } },
}

/**
 * GET /appointments
 * Query params aceitos:
 * - date=YYYY-MM-DD                (um dia)
 * - date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 * - professionalId                 (mapeia para userId)
 * - clientId, serviceId, status
 * - take, skip                     (pagina)
 */
async function list(req, res) {
  try {
    const {
      date,
      date_from,
      date_to,
      professionalId,
      clientId,
      serviceId,
      status,
      take,
      skip,
    } = req.query

    const where = {}

    // Filtro por período
    if (date) {
      const { start, end } = dayBounds(date)
      where.start = { gte: start, lte: end }
    } else if (date_from || date_to) {
      if (date_from) where.start = Object.assign(where.start || {}, { gte: atStartOfDay(date_from) })
      if (date_to)   where.start = Object.assign(where.start || {}, { lte: atEndOfDay(date_to) })
    }

    // Filtros adicionais
    if (professionalId) where.userId = String(professionalId)
    if (clientId)       where.clientId = String(clientId)
    if (serviceId)      where.serviceId = String(serviceId)
    if (status)         where.status = status

    const takeNum = take ? Math.min(parseInt(take, 10) || 0, 200) : 200
    const skipNum = skip ? parseInt(skip, 10) || 0 : 0

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { start: 'asc' },
        take: takeNum,
        skip: skipNum,
        include: defaultInclude,
      }),
      prisma.appointment.count({ where }),
    ])

    // Se quiser retornar as datas "sem Z" (local) para evitar o deslocamento no front,
    // descomente o bloco abaixo. OBS: Pode impactar outras integrações.
    /*
    const normalized = items.map(it => ({
      ...it,
      start: toLocalIsoNoZ(it.start),
      end:   toLocalIsoNoZ(it.end),
    }))
    return res.json({ items: normalized, total })
    */

    return res.json({ items, total })
  } catch (err) {
    console.error('[appointments.list] error:', err)
    return res.status(500).json({ message: 'Erro ao listar agendamentos.' })
  }
}

/**
 * GET /appointments/:id
 */
async function getById(req, res) {
  try {
    const { id } = req.params
    const item = await prisma.appointment.findUnique({
      where: { id },
      include: defaultInclude,
    })
    if (!item) return res.status(404).json({ message: 'Agendamento não encontrado.' })
    return res.json(item)
  } catch (err) {
    console.error('[appointments.getById] error:', err)
    return res.status(500).json({ message: 'Erro ao buscar agendamento.' })
  }
}

/**
 * POST /appointments
 * Body esperado (mínimo):
 * {
 *   start: "YYYY-MM-DDTHH:mm" | ISO,
 *   end:   "YYYY-MM-DDTHH:mm" | ISO,      // OU: durationMin + start
 *   durationMin?: number,
 *   userId: string,        // (barbeiro/profissional)
 *   serviceId: string,
 *   clientId: string,
 *   notes?: string,
 *   status?: "SCHEDULED" | "CONFIRMED" | "CANCELED" | "COMPLETED"
 * }
 */
async function create(req, res) {
  try {
    const {
      start,
      end,
      durationMin,
      userId,
      serviceId,
      clientId,
      notes,
      status,
      companyId, // opcional se você injeta via middleware multi-tenant
    } = req.body

    if (!start) return res.status(400).json({ message: 'Campo "start" é obrigatório.' })
    if (!userId) return res.status(400).json({ message: 'Campo "userId" é obrigatório.' })
    if (!serviceId) return res.status(400).json({ message: 'Campo "serviceId" é obrigatório.' })
    if (!clientId) return res.status(400).json({ message: 'Campo "clientId" é obrigatório.' })

    const startDt = parseAsLocalOrIso(start)
    let endDt = end ? parseAsLocalOrIso(end) : null

    if (!endDt) {
      const dur = parseInt(durationMin, 10)
      if (!dur || dur <= 0) {
        // buscar duração do serviço como fallback
        const svc = await prisma.service.findUnique({ where: { id: serviceId }, select: { duration: true } })
        const minutes = svc?.duration || 30
        endDt = new Date(startDt.getTime() + minutes * 60000)
      } else {
        endDt = new Date(startDt.getTime() + dur * 60000)
      }
    }

    const created = await prisma.appointment.create({
      data: {
        start: startDt,
        end: endDt,
        notes: notes || null,
        status: status || 'SCHEDULED',
        service: { connect: { id: serviceId } },
        user:    { connect: { id: userId } },
        client:  { connect: { id: clientId } },
        company: companyId ? { connect: { id: companyId } } : undefined,
      },
      include: defaultInclude,
    })

    return res.status(201).json(created)
  } catch (err) {
    console.error('[appointments.create] error:', err)
    return res.status(500).json({ message: 'Erro ao criar agendamento.' })
  }
}

/**
 * PUT /appointments/:id
 * Body: mesmos campos do POST (parciais)
 */
async function update(req, res) {
  try {
    const { id } = req.params
    const {
      start,
      end,
      durationMin,
      userId,
      serviceId,
      clientId,
      notes,
      status,
      cancelReasonId,
    } = req.body

    // montar objeto de update dinamicamente
    const data = {}
    if (notes !== undefined) data.notes = notes
    if (status) data.status = status
    if (cancelReasonId !== undefined) data.cancelReason = cancelReasonId ? { connect: { id: cancelReasonId } } : { disconnect: true }
    if (userId)    data.user    = { connect: { id: userId } }
    if (serviceId) data.service = { connect: { id: serviceId } }
    if (clientId)  data.client  = { connect: { id: clientId } }

    // tratar datas/duração
    let startDt = start ? parseAsLocalOrIso(start) : undefined
    let endDt   = end   ? parseAsLocalOrIso(end)   : undefined
    if (startDt && !endDt && durationMin) {
      endDt = new Date(startDt.getTime() + (parseInt(durationMin, 10) || 30) * 60000)
    }
    if (startDt) data.start = startDt
    if (endDt)   data.end   = endDt

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: defaultInclude,
    })
    return res.json(updated)
  } catch (err) {
    console.error('[appointments.update] error:', err)
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Agendamento não encontrado.' })
    }
    return res.status(500).json({ message: 'Erro ao atualizar agendamento.' })
  }
}

/**
 * DELETE /appointments/:id
 */
async function remove(req, res) {
  try {
    const { id } = req.params
    await prisma.appointment.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (err) {
    console.error('[appointments.remove] error:', err)
    if (err?.code === 'P2025') {
      return res.status(404).json({ message: 'Agendamento não encontrado.' })
    }
    return res.status(500).json({ message: 'Erro ao excluir agendamento.' })
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
}

/**
 * (Opcional) Helper para retornar ISO local SEM 'Z'
 * Útil se você quiser padronizar o retorno "sem fuso" no backend.
 */
function toLocalIsoNoZ(date) {
  const d = (date instanceof Date) ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${y}-${m}-${day}T${hh}:${mm}:${ss}.${ms}`
}
