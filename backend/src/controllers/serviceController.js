import prisma from '../prismaClient.js';

/* Helpers */
const toNumber = (v) =>
  v && typeof v === 'object' && typeof v.toNumber === 'function'
    ? v.toNumber()
    : Number(v);

const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(5, parseInt(req.query.pageSize ?? '20', 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
};

/* =========================
   LISTA MIN (para selects/autocomplete)
   GET /api/services/select?q=...&take=50&skip=0
   Retorna array leve [{id,name,price}]
   ========================= */
export const listServicesMin = async (req, res) => {
  try {
    const companyId = req.company.id;
    const q = (req.query.q || '').toString().trim();
    const take = Math.min(Number(req.query.take) || 50, 100);
    const skip = Number(req.query.skip) || 0;

    const where = {
      companyId,
      deletedAt: null,
      ...(q
        ? { name: { contains: q, mode: 'insensitive' } }
        : {}),
    };

    const items = await prisma.service.findMany({
      where,
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, price: true },
      skip,
      take,
    });

    // a CreatePackageModal aceita array direto
    return res.status(200).json(items);
  } catch (error) {
    console.error('❌ Erro ao listar serviços (min):', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* =========================
   LIST completa com paginação e busca
   GET /api/services?q=&page=&pageSize=
   Retorna {items, page, pageSize, total, totalPages}
   ========================= */
export const listServices = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { page, pageSize, skip, take } = parsePagination(req);
    const q = (req.query.q || '').toString().trim();

    const where = {
      companyId,
      deletedAt: null,
      ...(q
        ? { name: { contains: q, mode: 'insensitive' } }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.service.count({ where }),
      prisma.service.findMany({
        where,
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, price: true, duration: true, createdAt: true },
        skip,
        take,
      }),
    ]);

    res.status(200).json({
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Erro ao listar serviços:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* =========================
   CRIAR serviço
   Aceita: { name, price, duration | durationMinutes }
   ========================= */
export const createService = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { name, price, duration, durationMinutes } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Nome e preço são obrigatórios.' });
    }

    const p = toNumber(price);
    if (!Number.isFinite(p) || p < 0) {
      return res.status(400).json({ message: 'Preço inválido.' });
    }

    const durRaw = durationMinutes ?? duration;
    const d = durRaw !== undefined ? Number(durRaw) : null;
    if (d != null && (!Number.isFinite(d) || d < 0)) {
      return res.status(400).json({ message: 'Duração inválida.' });
    }

    const newService = await prisma.service.create({
      data: {
        name,
        price: p,                // Prisma Decimal aceita number/string
        duration: d,             // ajuste para seu schema se for outro campo
        companyId,
      },
      select: { id: true, name: true, price: true, duration: true },
    });

    res.status(201).json(newService);
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    res.status(500).json({ message: 'Erro ao criar serviço.' });
  }
};

/* =========================
   ATUALIZAR serviço
   ========================= */
export const updateService = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { name, price, duration, durationMinutes } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (price !== undefined) {
      const p = toNumber(price);
      if (!Number.isFinite(p) || p < 0) {
        return res.status(400).json({ message: 'Preço inválido.' });
      }
      data.price = p;
    }
    if (duration !== undefined || durationMinutes !== undefined) {
      const dRaw = durationMinutes ?? duration;
      const d = dRaw != null ? Number(dRaw) : null;
      if (d != null && (!Number.isFinite(d) || d < 0)) {
        return res.status(400).json({ message: 'Duração inválida.' });
      }
      data.duration = d;
    }

    const result = await prisma.service.updateMany({
      where: { id, companyId, deletedAt: null },
      data,
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Serviço não encontrado.' });
    }

    const updated = await prisma.service.findUnique({
      where: { id },
      select: { id: true, name: true, price: true, duration: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({ message: 'Erro ao atualizar serviço.' });
  }
};

/* =========================
   DELETAR serviço (hard delete)
   - se estiver vinculado, retorna 409
   ========================= */
export const deleteService = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    // Bloqueia exclusão se estiver em algum pacote
    const inPackage = await prisma.package.findFirst({
      where: { companyId, services: { some: { id } } },
      select: { id: true },
    });
    if (inPackage) {
      return res.status(409).json({
        message: 'Este serviço está vinculado a um ou mais pacotes e não pode ser excluído.',
      });
    }

    const result = await prisma.service.deleteMany({
      where: { id, companyId },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Serviço não encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('--- ERRO AO DELETAR SERVIÇO ---', error);
    if (error.code === 'P2003') {
      return res.status(409).json({
        message:
          'Este serviço não pode ser excluído, pois está sendo utilizado em um ou mais registros.',
      });
    }
    res.status(500).json({ message: 'Erro ao deletar serviço.' });
  }
};
