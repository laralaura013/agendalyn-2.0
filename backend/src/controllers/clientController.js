// src/controllers/clientController.js
import prisma from '../prismaClient.js';
import multer from 'multer';
import { parse as parseCsv } from 'csv-parse/sync';

/* =============== Upload (multer) =============== */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

/* =============== Feature flags / Helpers =============== */
const ENABLE_GENDER = String(process.env.ENABLE_CLIENT_GENDER || '').trim() === '1';

const toDate = (v) => (v ? new Date(v) : null);
const now = () => new Date();

const ensureCompany = (req) => {
  if (!req?.company?.id) {
    const err = new Error('Empresa não identificada no contexto da requisição.');
    err.status = 401;
    throw err;
  }
  return req.company.id;
};

const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize ?? '20', 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

const truthy = (v) => ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

const buildWhereFromQuery = (companyId, qRaw, filters = {}) => {
  const q = (qRaw || '').toString().trim();
  const { status, tag, uf, city, includeDeleted } = filters;

  const base = {
    companyId,
    ...(includeDeleted ? {} : { deletedAt: null }),
  };

  const where = {
    ...base,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { cpf: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } },
            { state: { contains: q, mode: 'insensitive' } },
            { tags: { has: q } },
          ],
        }
      : {}),
  };

  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (tag) where.tags = { has: tag };
  if (uf) where.state = { equals: uf, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };

  return where;
};

const buildAppointmentStatsMap = async (companyId, clientIds) => {
  if (!clientIds || clientIds.length === 0) return {};
  const stats = await prisma.appointment.groupBy({
    by: ['clientId'],
    where: {
      companyId,
      clientId: { in: clientIds },
      status: 'COMPLETED',
    },
    _count: { _all: true },
    _max: { start: true },
  });
  const map = {};
  for (const s of stats) {
    map[s.clientId] = {
      appointmentsCount: s._count?._all ?? 0,
      lastVisit: s._max?.start ?? null,
    };
  }
  return map;
};

const csvEscape = (v) => {
  if (v == null) return '';
  const s = String(v);
  if (s.includes('"') || s.includes(';') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const formatDateOnly = (d) => {
  try {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

/** Normaliza valores de gênero vindos de UI/CSV para o enum do Prisma */
const normalizeGender = (v) => {
  if (!v && v !== 0) return null;
  const s = String(v).trim().toLowerCase();

  if (['m', 'masculino', 'male', 'homem', 'masc'].includes(s)) return 'MALE';
  if (['f', 'feminino', 'female', 'mulher', 'fem'].includes(s)) return 'FEMALE';
  if (['o', 'outro', 'other', 'nao binario', 'não binário', 'nb'].includes(s)) return 'OTHER';

  if (['MALE', 'FEMALE', 'OTHER'].includes(String(v).toUpperCase())) return String(v).toUpperCase();

  return null;
};

/** Campos seguros de cliente para SELECT (sem password) */
const baseClientSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  cpf: true,
  rg: true,
  // gender: (somente quando ENABLE_GENDER === true)
  birthDate: true,
  notes: true,
  avatarUrl: true,
  zipCode: true,
  street: true,
  number: true,
  complement: true,
  district: true,
  city: true,
  state: true,
  tags: true,
  isActive: true,
  deletedAt: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  originId: true,
};

/* =======================================================================
 * SELECT para dropdowns (rápido/ativo)  -> GET /api/clients/select?q=jo
 * Somente clientes ATIVOS e não deletados
 * ======================================================================= */
export const listClientsForSelect = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const q = (req.query.q || '').toString().trim();
    const take = Math.min(Number(req.query.take) || 50, 100);

    const where = {
      companyId,
      deletedAt: null,
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { cpf: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const items = await prisma.client.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, phone: true, email: true },
      take,
    });

    return res.status(200).json(items);
  } catch (error) {
    console.error('❌ Erro ao listar clientes para select:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =======================================================================
 * LISTA MINIMAL para selects/autocomplete (rápida)
 * GET /api/clients/min?q=jo&take=20&skip=0&activeOnly=1
 * ======================================================================= */
export const listClientsMin = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const q = (req.query.q || '').toString().trim();
    const take = Math.min(Number(req.query.take) || 20, 50);
    const skip = Number(req.query.skip) || 0;
    const activeOnly = truthy(req.query.activeOnly);

    const where = {
      companyId,
      deletedAt: null,
      ...(activeOnly ? { isActive: true } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { cpf: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, phone: true, email: true },
        skip,
        take,
      }),
      prisma.client.count({ where }),
    ]);

    return res.status(200).json({
      items,
      total,
      skip,
      take,
      hasMore: skip + take < total,
    });
  } catch (error) {
    console.error('❌ Erro ao listar clientes (min):', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== LIST (filtros + paginação + stats) =============== */
export const listClients = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const { page, pageSize, skip, take } = parsePagination(req);
    const where = buildWhereFromQuery(companyId, req.query.q, {
      status: req.query.status,  // 'active' | 'inactive' | undefined
      tag: req.query.tag || undefined,
      uf: req.query.uf || undefined,
      city: req.query.city || undefined,
      includeDeleted: truthy(req.query.includeDeleted),
    });

    const select = { ...baseClientSelect, ...(ENABLE_GENDER ? { gender: true } : {}) };

    const [total, baseItems] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        orderBy: [{ deletedAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
        select,
      }),
    ]);

    const ids = baseItems.map((c) => c.id);
    const statsMap = await buildAppointmentStatsMap(companyId, ids);

    const items = baseItems.map((c) => ({
      ...c,
      appointmentsCount: statsMap[c.id]?.appointmentsCount ?? 0,
      lastVisit: statsMap[c.id]?.lastVisit ?? null,
    }));

    res.status(200).json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('❌ Erro ao listar clientes:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== GET by ID =============== */
export const getClientById = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const { id } = req.params;

    const includeDeleted = truthy(req.query.includeDeleted);

    const select = { ...baseClientSelect, ...(ENABLE_GENDER ? { gender: true } : {}) };

    const client = await prisma.client.findFirst({
      where: { id, companyId, ...(includeDeleted ? {} : { deletedAt: null }) },
      select,
    });

    if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });
    res.status(200).json(client);
  } catch (error) {
    console.error('❌ Erro ao buscar cliente por ID:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== CREATE =============== */
export const createClient = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const {
      name, email, phone, cpf, rg, gender, birthDate, notes,
      avatarUrl, zipCode, street, number, complement, district, city, state,
      tags, originId, isActive,
    } = req.body;

    const data = {
      name, email, phone, cpf, rg,
      birthDate: toDate(birthDate),
      notes, avatarUrl, zipCode, street, number, complement, district, city, state,
      tags: Array.isArray(tags) ? tags : [],
      originId: originId || null,
      isActive: isActive ?? true,
      deletedAt: null,
      companyId,
    };

    if (ENABLE_GENDER) {
      const g = normalizeGender(gender);
      if (g) data.gender = g;
    }

    const client = await prisma.client.create({ data });

    res.status(201).json(client);
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'E-mail ou CPF já utilizado nesta empresa.' });
    }
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== UPDATE =============== */
export const updateClient = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const { id } = req.params;
    const {
      name, email, phone, cpf, rg, gender, birthDate, notes,
      avatarUrl, zipCode, street, number, complement, district, city, state,
      tags, originId, isActive,
    } = req.body;

    const data = {
      name, email, phone, cpf, rg,
      birthDate: toDate(birthDate),
      notes, avatarUrl, zipCode, street, number, complement, district, city, state,
      tags: Array.isArray(tags) ? tags : undefined,
      originId: originId ?? undefined,
      isActive: typeof isActive === 'boolean' ? isActive : undefined,
    };

    if (ENABLE_GENDER) {
      data.gender = normalizeGender(gender);
    }

    const result = await prisma.client.updateMany({
      where: { id, companyId },
      data,
    });

    if (result.count === 0) return res.status(404).json({ message: 'Cliente não encontrado.' });
    res.status(200).json({ message: 'Cliente atualizado com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao atualizar cliente:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ message: 'E-mail ou CPF já utilizado nesta empresa.' });
    }
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== SOFT DELETE / RESTORE / HARD DELETE =============== */
export const softDeleteClient = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const { id } = req.params;

    const result = await prisma.client.updateMany({
      where: { id, companyId, deletedAt: null },
      data: { deletedAt: now(), isActive: false },
    });

    if (result.count === 0) return res.status(404).json({ message: 'Cliente não encontrado ou já deletado.' });
    res.status(200).json({ message: 'Cliente movido para lixeira.' });
  } catch (error) {
    console.error('❌ Erro ao soft-delete cliente:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

export const restoreClient = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const { id } = req.params;

    const result = await prisma.client.updateMany({
      where: { id, companyId, NOT: { deletedAt: null } },
      data: { deletedAt: null, isActive: true },
    });

    if (result.count === 0) return res.status(404).json({ message: 'Cliente não encontrado na lixeira.' });
    res.status(200).json({ message: 'Cliente restaurado.' });
  } catch (error) {
    console.error('❌ Erro ao restaurar cliente:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

// CUIDADO: remove definitivamente
export const hardDeleteClient = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.appointment.deleteMany({ where: { companyId, clientId: id } });
      await tx.order.deleteMany({ where: { companyId, clientId: id } });
      await tx.clientPackage.deleteMany({ where: { clientId: id } });
      await tx.anamnesisAnswer.deleteMany({ where: { clientId: id } });
      await tx.waitlist.deleteMany({ where: { companyId, clientId: id } });
      await tx.receivable.updateMany({ where: { companyId, clientId: id }, data: { clientId: null } });
      await tx.client.deleteMany({ where: { id, companyId } });
    });
    res.status(200).json({ message: 'Cliente removido definitivamente.' });
  } catch (error) {
    console.error('❌ Erro ao hard-delete cliente:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== BULK ACTIONS (soft delete / restore) =============== */
export const bulkSoftDelete = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ message: 'Informe ids.' });

    const result = await prisma.client.updateMany({
      where: { companyId, id: { in: ids }, deletedAt: null },
      data: { deletedAt: now(), isActive: false },
    });
    res.status(200).json({ message: 'Clientes movidos para lixeira.', count: result.count });
  } catch (error) {
    console.error('❌ Erro em bulk soft delete:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

export const bulkRestore = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (ids.length === 0) return res.status(400).json({ message: 'Informe ids.' });

    const result = await prisma.client.updateMany({
      where: { companyId, id: { in: ids }, NOT: { deletedAt: null } },
      data: { deletedAt: null, isActive: true },
    });
    res.status(200).json({ message: 'Clientes restaurados.', count: result.count });
  } catch (error) {
    console.error('❌ Erro em bulk restore:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== MERGE (winner x loser) =============== */
export const mergeClients = async (req, res) => {
  const companyId = ensureCompany(req);
  const { winnerId, loserId } = req.body;
  if (!winnerId || !loserId || winnerId === loserId) {
    return res.status(400).json({ message: 'Informe winnerId e loserId diferentes.' });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const [winner, loser] = await Promise.all([
        tx.client.findFirst({ where: { id: winnerId, companyId } }),
        tx.client.findFirst({ where: { id: loserId, companyId } }),
      ]);
      if (!winner || !loser) throw new Error('Clientes não encontrados.');
      if (loser.deletedAt) throw new Error('Cliente perdedor já está deletado.');

      // Reatribuir relações do loser -> winner
      await tx.appointment.updateMany({ where: { companyId, clientId: loserId }, data: { clientId: winnerId } });
      await tx.order.updateMany({ where: { companyId, clientId: loserId }, data: { clientId: winnerId } });
      await tx.clientPackage.updateMany({ where: { clientId: loserId }, data: { clientId: winnerId } });
      await tx.anamnesisAnswer.updateMany({ where: { clientId: loserId }, data: { clientId: winnerId } });
      await tx.waitlist.updateMany({ where: { companyId, clientId: loserId }, data: { clientId: winnerId } });
      await tx.receivable.updateMany({ where: { companyId, clientId: loserId }, data: { clientId: winnerId } });

      // Mesclar dados
      const merged = {
        name: winner.name || loser.name,
        email: winner.email || loser.email,
        phone: winner.phone || loser.phone,
        cpf: winner.cpf || loser.cpf,
        rg: winner.rg || loser.rg,
        birthDate: winner.birthDate || loser.birthDate,
        notes: winner.notes || loser.notes,
        avatarUrl: winner.avatarUrl || loser.avatarUrl,
        zipCode: winner.zipCode || loser.zipCode,
        street: winner.street || loser.street,
        number: winner.number || loser.number,
        complement: winner.complement || loser.complement,
        district: winner.district || loser.district,
        city: winner.city || loser.city,
        state: winner.state || loser.state,
        tags: Array.from(new Set([...(winner.tags || []), ...(loser.tags || [])])),
        originId: winner.originId || loser.originId,
        isActive: winner.isActive || loser.isActive,
      };
      if (ENABLE_GENDER) {
        merged.gender = winner.gender || loser.gender || null;
      }

      await tx.client.update({
        where: { id: winnerId },
        data: merged,
      });

      // Soft-delete perdedor
      await tx.client.update({
        where: { id: loserId },
        data: { deletedAt: now(), isActive: false },
      });
    });

    res.status(200).json({ message: 'Clientes mesclados com sucesso.' });
  } catch (error) {
    console.error('❌ Erro ao mesclar clientes:', error);
    res.status(500).json({ message: error?.message || 'Erro interno do servidor.' });
  }
};

/* =============== EXPORT CSV =============== */
export const exportClientsCsv = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    const where = buildWhereFromQuery(companyId, req.query.q, {
      status: req.query.status,
      tag: req.query.tag,
      uf: req.query.uf,
      city: req.query.city,
      includeDeleted: truthy(req.query.includeDeleted),
    });

    const select = { ...baseClientSelect, ...(ENABLE_GENDER ? { gender: true } : {}) };

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select,
    });

    const ids = clients.map((c) => c.id);
    const statsMap = await buildAppointmentStatsMap(companyId, ids);

    const header = [
      'Nome','Email','Telefone','CPF','RG','Sexo','Nascimento',
      'CEP','Rua','Número','Complemento','Bairro','Cidade','UF',
      'Tags','Ativo','DeletadoEm',
      'Atendimentos','UltimaVisita',
      'CriadoEm','AtualizadoEm'
    ].join(';');

    const lines = clients.map((c) => {
      const s = statsMap[c.id] || { appointmentsCount: 0, lastVisit: null };
      const genderText = ENABLE_GENDER ? (c.gender ?? '') : '';
      return [
        csvEscape(c.name),
        csvEscape(c.email ?? ''),
        csvEscape(c.phone ?? ''),
        csvEscape(c.cpf ?? ''),
        csvEscape(c.rg ?? ''),
        csvEscape(genderText),
        csvEscape(formatDateOnly(c.birthDate)),
        csvEscape(c.zipCode ?? ''),
        csvEscape(c.street ?? ''),
        csvEscape(c.number ?? ''),
        csvEscape(c.complement ?? ''),
        csvEscape(c.district ?? ''),
        csvEscape(c.city ?? ''),
        csvEscape(c.state ?? ''),
        csvEscape(Array.isArray(c.tags) ? c.tags.join(', ') : ''),
        csvEscape(c.isActive ? 'SIM' : 'NÃO'),
        csvEscape(formatDateOnly(c.deletedAt)),
        csvEscape(s.appointmentsCount),
        csvEscape(formatDateOnly(s.lastVisit)),
        csvEscape(formatDateOnly(c.createdAt)),
        csvEscape(formatDateOnly(c.updatedAt)),
      ].join(';');
    });

    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('❌ Erro ao exportar CSV de clientes:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};

/* =============== IMPORT CSV (multer) =============== */
/**
 * Espera um CSV com cabeçalho. Colunas reconhecidas (case-insensitive):
 * name,email,phone,cpf,rg,gender,birthDate,zipCode,street,number,complement,district,city,state,tags,notes,isActive
 * Separador ; ou ,  | Data no formato AAAA-MM-DD
 */
export const importClientsCsv = async (req, res) => {
  try {
    const companyId = ensureCompany(req);
    if (!req.file) return res.status(400).json({ message: 'Envie um arquivo CSV em "file".' });

    const content = req.file.buffer.toString('utf-8');
    const records = parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: content.includes(';') ? ';' : ',',
      trim: true,
    });

    let created = 0, updated = 0, skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const r of records) {
        const norm = (s) => (s == null ? '' : String(s).trim());
        const tags = norm(r.tags)
          ? norm(r.tags).split(',').map((t) => t.trim()).filter(Boolean)
          : [];

        // tentar match por email ou cpf
        const emailCond = norm(r.email) ? { email: norm(r.email) } : undefined;
        const cpfCond = norm(r.cpf) ? { cpf: norm(r.cpf) } : undefined;

        const existing = await tx.client.findFirst({
          where: {
            companyId,
            OR: [emailCond, cpfCond].filter(Boolean),
          },
        });

        const payload = {
          name: norm(r.name),
          email: norm(r.email) || null,
          phone: norm(r.phone),
          cpf: norm(r.cpf) || null,
          rg: norm(r.rg) || null,
          birthDate: norm(r.birthDate) ? toDate(norm(r.birthDate)) : null,
          zipCode: norm(r.zipCode) || null,
          street: norm(r.street) || null,
          number: norm(r.number) || null,
          complement: norm(r.complement) || null,
          district: norm(r.district) || null,
          city: norm(r.city) || null,
          state: norm(r.state) || null,
          notes: norm(r.notes) || null,
          tags,
          isActive:
            norm(r.isActive).toLowerCase() === 'true' ||
            norm(r.isActive).toUpperCase() === 'SIM',
          deletedAt: null,
          companyId,
        };

        if (ENABLE_GENDER) {
          const g = normalizeGender(norm(r.gender));
          payload.gender = g;
        }

        if (!payload.name || !payload.phone) {
          skipped++;
          continue;
        }

        if (existing) {
          await tx.client.update({
            where: { id: existing.id },
            data: payload,
          });
          updated++;
        } else {
          await tx.client.create({ data: payload });
          created++;
        }
      }
    });

    res.status(200).json({ message: 'Importação concluída.', created, updated, skipped });
  } catch (error) {
    console.error('❌ Erro ao importar CSV:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erro interno do servidor.' });
  }
};
