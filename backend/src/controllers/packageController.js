import prisma from '../prismaClient.js';

// Helper: Prisma Decimal -> number (ou Number() seguro)
const toNumber = (v) =>
  v && typeof v === 'object' && typeof v.toNumber === 'function'
    ? v.toNumber()
    : Number(v);

/* =========================
   LISTAR pacotes da empresa
   ========================= */
export const listPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: { companyId: req.company.id },
      include: {
        services: { select: { id: true, name: true, price: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(packages);
  } catch (error) {
    console.error('Erro ao listar pacotes:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* =========================
   CRIAR novo pacote
   - aceita serviceIds OU services
   - sessions/validityDays são opcionais (defaults)
   ========================= */
export const createPackage = async (req, res) => {
  try {
    const companyId = req.company.id;

    const {
      name,
      price,
      sessions,       // opcional
      validityDays,   // opcional
      serviceIds,     // preferido
      services,       // fallback (alguns fronts/backs usam esse nome)
    } = req.body;

    // normalizações
    const svcIds = Array.isArray(serviceIds)
      ? serviceIds
      : Array.isArray(services)
      ? services
      : [];

    if (!name || price === undefined || svcIds.length === 0) {
      return res.status(400).json({
        message:
          'Nome, preço e pelo menos um serviço são obrigatórios.',
      });
    }

    const parsedPrice = toNumber(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Preço inválido.' });
    }

    // Defaults que evitam quebra com o front
    const parsedSessions = Number.isFinite(Number(sessions))
      ? Number(sessions)
      : 1; // default 1
    const parsedValidity = Number.isFinite(Number(validityDays))
      ? Number(validityDays)
      : 365; // default 365

    const newPackage = await prisma.package.create({
      data: {
        name,
        price: parsedPrice,
        sessions: parsedSessions,
        validityDays: parsedValidity,
        companyId,
        services: {
          connect: svcIds.map((id) => ({ id })),
        },
      },
      include: {
        services: { select: { id: true, name: true, price: true } },
      },
    });

    res.status(201).json(newPackage);
  } catch (error) {
    console.error('--- ERRO AO CRIAR PACOTE ---', error);
    res.status(500).json({ message: 'Erro ao criar pacote.' });
  }
};

/* =========================
   DELETAR pacote
   - valida empresa
   - impede exclusão se já houve vendas (ClientPackage vinculado)
   - limpa relação N:N com services antes de deletar
   ========================= */
export const deletePackage = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;

    const pkg = await prisma.package.findFirst({
      where: { id, companyId },
      include: { _count: { select: { clientPackages: true } } },
    });

    if (!pkg) {
      return res.status(404).json({ message: 'Pacote não encontrado.' });
    }

    if (pkg._count?.clientPackages > 0) {
      return res.status(400).json({
        message:
          'Este pacote já possui vendas e não pode ser excluído.',
      });
    }

    await prisma.$transaction(async (tx) => {
      // limpa N:N
      await tx.package.update({
        where: { id },
        data: { services: { set: [] } },
      });
      // deleta pacote
      await tx.package.delete({ where: { id } });
    });

    res.status(200).json({ message: 'Pacote excluído com sucesso.' });
  } catch (error) {
    console.error('--- ERRO AO DELETAR PACOTE ---', error);
    res.status(500).json({ message: 'Erro ao deletar pacote.' });
  }
};

/* =========================
   VENDER pacote para cliente
   ========================= */
export const sellPackageToClient = async (req, res) => {
  const { packageId, clientId, paymentMethod } = req.body; // paymentMethod recebido mas ignorado (schema não tem campo)
  const companyId = req.company.id;
  const userId = req.user.id;

  try {
    const pkg = await prisma.package.findFirst({
      where: { id: packageId, companyId },
    });

    if (!pkg) {
      return res.status(404).json({ message: 'Pacote não encontrado.' });
    }

    const price = toNumber(pkg.price);
    const sessions = Number(pkg.sessions);

    if (!Number.isFinite(sessions) || sessions <= 0) {
      return res.status(400).json({
        message:
          'Pacote inválido: O número de sessões não está definido ou é zero.',
      });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        message: 'Pacote inválido: O preço não está definido.',
      });
    }

    const activeCashier = await prisma.cashierSession.findFirst({
      where: { companyId, status: 'OPEN' },
    });
    if (!activeCashier) {
      return res.status(400).json({
        message: 'Nenhum caixa aberto para registrar a venda.',
      });
    }

    // Necessário ter ao menos um serviço cadastrado para amarrar a comanda
    const placeholderService = await prisma.service.findFirst({
      where: { companyId },
    });
    if (!placeholderService) {
      return res.status(400).json({
        message:
          'A empresa precisa ter pelo menos um serviço cadastrado.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Comanda finalizada no ato da venda
      await tx.order.create({
        data: {
          total: price,
          status: 'FINISHED',
          companyId,
          clientId,
          userId,
          items: {
            create: {
              quantity: 1,
              price: price,
              serviceId: placeholderService.id,
            },
          },
        },
      });

      // Lançamento no caixa
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: price,
          description: `Venda do Pacote: ${pkg.name}`,
          cashierSessionId: activeCashier.id,
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + (pkg.validityDays || 365)
      );

      // ClientPackage no schema não tem companyId
      const clientPackage = await tx.clientPackage.create({
        data: {
          sessionsRemaining: sessions,
          expiresAt,
          clientId,
          packageId,
        },
      });

      return clientPackage;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('--- ERRO AO VENDER PACOTE ---', error);
    res
      .status(500)
      .json({
        message:
          error.message || 'Erro interno do servidor ao vender o pacote.',
      });
  }
};

/* =========================
   LISTAR pacotes comprados de um cliente
   ========================= */
export const listClientPackages = async (req, res) => {
  try {
    const { clientId } = req.params;
    const clientPackages = await prisma.clientPackage.findMany({
      where: { clientId },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(clientPackages);
  } catch (error) {
    console.error('Erro ao listar pacotes do cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/* =========================
   CONSUMIR uma sessão de pacote
   ========================= */
export const usePackageSession = async (req, res) => {
  try {
    const { clientPackageId } = req.params;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const clientPackage = await tx.clientPackage.findUnique({
        where: { id: clientPackageId },
      });

      if (!clientPackage)
        throw new Error('Pacote do cliente não encontrado.');
      if (clientPackage.sessionsRemaining <= 0)
        throw new Error('Este pacote não tem mais sessões disponíveis.');
      if (new Date() > new Date(clientPackage.expiresAt))
        throw new Error('Este pacote já expirou.');

      const updatedClientPackage = await tx.clientPackage.update({
        where: { id: clientPackageId },
        data: { sessionsRemaining: { decrement: 1 } },
      });

      await tx.packageSessionUsage.create({
        data: { clientPackageId, userId },
      });

      return updatedClientPackage;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('--- ERRO AO USAR SESSÃO DO PACOTE ---', error);
    res
      .status(400)
      .json({ message: error.message || 'Erro ao usar a sessão do pacote.' });
  }
};
