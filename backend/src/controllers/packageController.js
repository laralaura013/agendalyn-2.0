import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// LISTAR todas as definições de Pacotes
export const listPackages = async (req, res) => {
    try {
        const packages = await prisma.package.findMany({
            where: { companyId: req.company.id },
            include: { services: { select: { name: true } } }
        });
        res.status(200).json(packages);
    } catch (error) {
        console.error("Erro ao listar pacotes:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// CRIAR uma nova definição de Pacote
export const createPackage = async (req, res) => {
    try {
        const { name, price, sessions, validityDays, serviceIds } = req.body;
        const companyId = req.company.id;

        if (!name || !price || !sessions || !validityDays || !serviceIds || serviceIds.length === 0) {
            return res.status(400).json({ message: "Todos os campos, incluindo pelo menos um serviço, são obrigatórios." });
        }

        const newPackage = await prisma.package.create({
            data: {
                name,
                price: parseFloat(price),
                sessions: parseInt(sessions),
                validityDays: parseInt(validityDays),
                companyId,
                services: {
                    connect: serviceIds.map(id => ({ id: id }))
                }
            }
        });
        res.status(201).json(newPackage);
    } catch (error) {
        console.error("--- ERRO AO CRIAR PACOTE ---", error);
        res.status(500).json({ message: 'Erro ao criar pacote.' });
    }
};

// VENDER um Pacote para um Cliente
export const sellPackageToClient = async (req, res) => {
    const { packageId, clientId } = req.body;
    const companyId = req.company.id;
    const userId = req.user.id;

    try {
        const pkg = await prisma.package.findUnique({ where: { id: packageId } });
        if (!pkg) return res.status(404).json({ message: "Pacote não encontrado." });

        const activeCashier = await prisma.cashierSession.findFirst({
            where: { companyId, status: 'OPEN' },
        });
        if (!activeCashier) return res.status(400).json({ message: "Nenhum caixa aberto para registrar a venda." });
        
        const placeholderService = await prisma.service.findFirst({ where: { companyId } });
        if (!placeholderService) throw new Error("A empresa precisa ter pelo menos um serviço cadastrado para vender pacotes.");

        const result = await prisma.$transaction(async (tx) => {
            // 1. Cria a comanda para a venda do pacote
            const order = await tx.order.create({
                data: {
                    total: pkg.price,
                    status: 'FINISHED',
                    companyId,
                    clientId,
                    userId,
                    items: { create: { quantity: 1, price: pkg.price, serviceId: placeholderService.id } }
                }
            });

            // 2. Cria a transação de entrada no caixa
            await tx.transaction.create({
                data: {
                    type: 'INCOME',
                    amount: pkg.price,
                    description: `Venda do Pacote: ${pkg.name}`,
                    cashierSessionId: activeCashier.id,
                }
            });

            // 3. Associa o pacote ao cliente
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);
            const clientPackage = await tx.clientPackage.create({
                data: {
                    sessionsRemaining: pkg.sessions,
                    expiresAt,
                    clientId,
                    packageId,
                }
            });
            return clientPackage;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error("--- ERRO AO VENDER PACOTE ---", error);
        res.status(500).json({ message: error.message || 'Erro ao vender pacote.' });
    }
};

// LISTAR os Pacotes de um Cliente específico
export const listClientPackages = async (req, res) => {
    try {
        const { clientId } = req.params;
        const clientPackages = await prisma.clientPackage.findMany({
            where: { 
                clientId: clientId,
                // Adicionando companyId para segurança, assumindo que ClientPackage terá a relação
                // Para isso, precisamos adicionar `companyId` ao modelo ClientPackage no schema.prisma
                // Por enquanto, vamos confiar na rota protegida.
             },
            include: {
                package: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(clientPackages);
    } catch (error) {
        console.error("Erro ao listar pacotes do cliente:", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// USAR (dar baixa) em uma Sessão de um Pacote
export const usePackageSession = async (req, res) => {
    try {
        const { clientPackageId } = req.params;
        const userId = req.user.id;

        const result = await prisma.$transaction(async (tx) => {
            const clientPackage = await tx.clientPackage.findUnique({
                where: { id: clientPackageId },
            });

            if (!clientPackage) throw new Error("Pacote do cliente não encontrado.");
            if (clientPackage.sessionsRemaining <= 0) throw new Error("Este pacote não tem mais sessões disponíveis.");
            if (new Date() > new Date(clientPackage.expiresAt)) throw new Error("Este pacote já expirou.");
            
            const updatedClientPackage = await tx.clientPackage.update({
                where: { id: clientPackageId },
                data: { sessionsRemaining: { decrement: 1 } },
            });

            await tx.packageSessionUsage.create({
                data: {
                    clientPackageId,
                    userId,
                }
            });

            return updatedClientPackage;
        });

        res.status(200).json(result);

    } catch (error) {
        console.error("--- ERRO AO USAR SESSÃO DO PACOTE ---", error);
        res.status(400).json({ message: error.message || 'Erro ao usar a sessão do pacote.' });
    }
};