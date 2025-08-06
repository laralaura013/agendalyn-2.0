import prisma from '../prismaClient.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Helper: Prisma Decimal -> number (ou Number() seguro)
const toNumber = (v) =>
  v && typeof v === 'object' && typeof v.toNumber === 'function'
    ? v.toNumber()
    : Number(v);

// LISTAR pacotes da empresa
export const listPackages = async (req, res) => {
  try {
    const packages = await prisma.package.findMany({
      where: { companyId: req.company.id },
      include: { services: { select: { name: true } } }
    });
    res.status(200).json(packages);
  } catch (error) {
    console.error('Erro ao listar pacotes:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// CRIAR novo pacote
export const createPackage = async (req, res) => {
  try {
    const { name, price, sessions, validityDays, serviceIds } = req.body;
    const companyId = req.company.id;

    if (!name || price === undefined || sessions === undefined || validityDays === undefined || !serviceIds || serviceIds.length === 0) {
      return res.status(400).json({ message: 'Todos os campos, incluindo pelo menos um serviço, são obrigatórios.' });
    }

    const parsedPrice = toNumber(price);
    const parsedSessions = Number(sessions);
    const parsedValidity = Number(validityDays);

    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedSessions) || !Number.isFinite(parsedValidity)) {
      return res.status(400).json({ message: 'Preço, sessões e validade devem ser números válidos.' });
    }

    const newPackage = await prisma.package.create({
      data: {
        name,
        price: parsedPrice,
        sessions: parsedSessions,
        validityDays: parsedValidity,
        companyId,
        services: {
          connect: serviceIds.map((id) => ({ id }))
        }
      }
    });

    res.status(201).json(newPackage);
  } catch (error) {
    console.error('--- ERRO AO CRIAR PACOTE ---', error);
    res.status(500).json({ message: 'Erro ao criar pacote.' });
  }
};

// VENDER pacote para cliente
export const sellPackageToClient = async (req, res) => {
  const { packageId, clientId, paymentMethod } = req.body; // paymentMethod recebido mas ignorado no storage (schema não tem campo)
  const companyId = req.company.id;
  const userId = req.user.id;

  try {
    // garante multi-tenant
    const pkg = await prisma.package.findFirst({
      where: { id: packageId, companyId }
    });

    if (!pkg) {
      return res.status(404).json({ message: 'Pacote não encontrado.' });
    }

    const price = toNumber(pkg.price);
    const sessions = Number(pkg.sessions);

    if (!Number.isFinite(sessions) || sessions <= 0) {
      return res.status(400).json({ message: 'Pacote inválido: O número de sessões não está definido ou é zero.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: 'Pacote inválido: O preço não está definido.' });
    }

    const activeCashier = await prisma.cashierSession.findFirst({
      where: { companyId, status: 'OPEN' }
    });
    if (!activeCashier) {
      return res.status(400).json({ message: 'Nenhum caixa aberto para registrar a venda.' });
    }

    // Necessário ter ao menos um serviço cadastrado para amarrar a comanda
    const placeholderService = await prisma.service.findFirst({ where: { companyId } });
    if (!placeholderService) {
      return res.status(400).json({ message: 'A empresa precisa ter pelo menos um serviço cadastrado.' });
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
              serviceId: placeholderService.id
            }
          }
        }
      });

      // Lançamento no caixa (schema Transaction não tem paymentMethod)
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: price,
          description: `Venda do Pacote: ${pkg.name}`,
          cashierSessionId: activeCashier.id
        }
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (pkg.validityDays || 365));

      // Importante: ClientPackage no seu schema NÃO tem companyId
      const clientPackage = await tx.clientPackage.create({
        data: {
          sessionsRemaining: sessions,
          expiresAt,
          clientId,
          packageId
        }
      });

      return clientPackage;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('--- ERRO AO VENDER PACOTE ---', error);
    res.status(500).json({ message: error.message || 'Erro interno do servidor ao vender o pacote.' });
  }
};

// LISTAR pacotes comprados de um cliente
export const listClientPackages = async (req, res) => {
  try {
    const { clientId } = req.params;
    const clientPackages = await prisma.clientPackage.findMany({
      where: { clientId },
      include: { package: true },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(clientPackages);
  } catch (error) {
    console.error('Erro ao listar pacotes do cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

// CONSUMIR uma sessão de pacote
export const usePackageSession = async (req, res) => {
  try {
    const { clientPackageId } = req.params;
    const userId = req.user.id;

    const result = await prisma.$transaction(async (tx) => {
      const clientPackage = await tx.clientPackage.findUnique({
        where: { id: clientPackageId }
      });

      if (!clientPackage) throw new Error('Pacote do cliente não encontrado.');
      if (clientPackage.sessionsRemaining <= 0) throw new Error('Este pacote não tem mais sessões disponíveis.');
      if (new Date() > new Date(clientPackage.expiresAt)) throw new Error('Este pacote já expirou.');

      const updatedClientPackage = await tx.clientPackage.update({
        where: { id: clientPackageId },
        data: { sessionsRemaining: { decrement: 1 } }
      });

      await tx.packageSessionUsage.create({
        data: {
          clientPackageId,
          userId
        }
      });

      return updatedClientPackage;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('--- ERRO AO USAR SESSÃO DO PACOTE ---', error);
    res.status(400).json({ message: error.message || 'Erro ao usar a sessão do pacote.' });
  }
};
