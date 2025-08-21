import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';

/* ===================== Helpers ===================== */
const parseDecimalNullable = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const parseVisible = (v) => {
  if (v == null) return undefined;
  const s = String(v).toLowerCase();
  if (['yes', 'true', '1'].includes(s)) return true;
  if (['no', 'false', '0'].includes(s)) return false;
  return undefined;
};

const safeWorkSchedule = (workSchedule) => {
  if (workSchedule === undefined) return undefined;
  if (workSchedule === null) return null;
  if (typeof workSchedule === 'string') {
    try { return JSON.parse(workSchedule); } catch { return {}; }
  }
  if (typeof workSchedule === 'object') return workSchedule;
  return {};
};

/* ========================= LIST =========================
 * GET /api/staff?q=&role=&visible=YES|NO
 */
export const listStaff = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { q, role, visible } = req.query;

    const where = { companyId };
    if (q && String(q).trim()) {
      const term = String(q).trim();
      where.OR = [
        { name:  { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;
    const vis = parseVisible(visible);
    if (typeof vis === 'boolean') where.showInBooking = vis;

    const staff = await prisma.user.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        workSchedule: true,
        commission: true,
        phone: true,
        nickname: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(staff);
  } catch (error) {
    console.error('Erro ao listar colaboradores:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* ========================= CREATE ========================= */
export const createStaff = async (req, res) => {
  try {
    const { name, email, password, role, showInBooking, workSchedule, commission, phone, nickname } = req.body;
    const companyId = req.company.id;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const ws = safeWorkSchedule(workSchedule);
    if (ws && typeof ws === 'object') {
      for (const day of Object.values(ws)) {
        if (day?.active && day.end <= day.start) {
          return res.status(400).json({ message: 'Horário inválido: fim deve ser maior que início.' });
        }
      }
    }

    const created = await prisma.user.create({
      data: {
        companyId,
        name,
        email,
        password: hashedPassword,
        role: role || 'STAFF',
        showInBooking: typeof showInBooking === 'boolean' ? showInBooking : true,
        workSchedule: ws ?? {},
        commission: parseDecimalNullable(commission),
        phone: phone || null,
        nickname: nickname || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        workSchedule: true,
        commission: true,
        phone: true,
        nickname: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    if (error?.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    console.error('--- ERRO AO CRIAR COLABORADOR ---', error);
    res.status(500).json({ message: 'Erro ao criar colaborador.' });
  }
};

/* ========================= UPDATE (parcial) ========================= */
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    const { name, email, role, password, showInBooking, workSchedule, commission, phone, nickname } = req.body;

    const data = {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(typeof showInBooking === 'boolean' ? { showInBooking } : {}),
      ...(workSchedule !== undefined ? { workSchedule: safeWorkSchedule(workSchedule) } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(nickname !== undefined ? { nickname } : {}),
    };

    if (commission !== undefined) {
      data.commission = parseDecimalNullable(commission);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }

    const result = await prisma.user.updateMany({
      where: { id, companyId },
      data,
    });

    if (result.count === 0) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    const updated = await prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        workSchedule: true,
        commission: true,
        phone: true,
        nickname: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    if (error?.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({ message: 'Este email já está em uso.' });
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ message: 'Colaborador não encontrado.' });
    }
    console.error('--- ERRO AO ATUALIZAR COLABORADOR ---', error);
    res.status(500).json({ message: 'Erro ao atualizar colaborador.' });
  }
};

/* ========================= DELETE ========================= */
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('--- ERRO AO DELETAR COLABORADOR ---', error);
    res.status(500).json({ message: 'Erro ao deletar colaborador.' });
  }
};

/* ========================= EXPORT CSV ========================= */
export const exportStaffCsv = async (req, res) => {
  try {
    const companyId = req.company.id;

    const rows = await prisma.user.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        showInBooking: true,
        commission: true,
        phone: true,
        nickname: true,
        createdAt: true,
      },
    });

    const cols = ['id','name','email','role','showInBooking','commission','phone','nickname','createdAt'];
    const header = cols.join(',');
    const lines = rows.map((r) =>
      cols.map((c) => {
        const v = r[c] ?? '';
        const s = String(v).replace(/"/g, '""');
        return /[,"\n]/.test(s) ? `"${s}"` : s;
      }).join(',')
    );
    const csv = [header, ...lines].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="colaboradores.csv"');
    res.send(csv);
  } catch (error) {
    console.error('--- ERRO AO EXPORTAR CSV ---', error);
    res.status(500).json({ message: 'Falha ao exportar CSV.' });
  }
};

/* ========================= VISIBILIDADE (dedicado) ========================= */
export const setStaffVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    const value = req.body?.showInBooking;
    if (typeof value !== 'boolean') {
      return res.status(400).json({ message: 'Parâmetro showInBooking inválido.' });
    }

    const exists = await prisma.user.findFirst({ where: { id, companyId } });
    if (!exists) return res.status(404).json({ message: 'Colaborador não encontrado.' });

    const updated = await prisma.user.update({
      where: { id },
      data: { showInBooking: value },
      select: { id: true, showInBooking: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error('--- ERRO AO ALTERAR VISIBILIDADE ---', error);
    return res.status(500).json({ message: 'Falha ao alterar visibilidade.' });
  }
};
