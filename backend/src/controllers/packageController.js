import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Suas funções existentes (listPackages, createPackage, etc.)
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

// --- FUNÇÃO DE VENDA CORRIGIDA E MAIS SEGURA ---
export const sellPackageToClient = async (req, res) => {
    // Mantive a sua lógica original de receber os dados
    const { packageId, clientId, paymentMethod } = req.body; // Adicionado paymentMethod aqui
    const companyId = req.company.id;
    const userId = req.user.id;

    try {
        // 1. Busca do pacote a ser vendido
        const pkg = await prisma.package.findUnique({ where: { id: packageId } });
        if (!pkg) {
            return res.status(404).json({ message: "Pacote não encontrado." });
        }

        // 2. Validação robusta dos dados do pacote para evitar erros
        if (typeof pkg.sessions !== 'number' || pkg.sessions <= 0) {
            return res.status(400).json({ message: "Pacote inválido: O número de sessões não está definido ou é zero." });
        }
        if (typeof pkg.price !== 'number' || pkg.price < 0) {
            return res.status(400).json({ message: "Pacote inválido: O preço não está definido." });
        }

        // 3. Busca de um caixa aberto
        const activeCashier = await prisma.cashierSession.findFirst({
            where: { companyId, status: 'OPEN' },
        });
        if (!activeCashier) {
            return res.status(400).json({ message: "Nenhum caixa aberto para registar a venda." });
        }
        
        // 4. Lógica do serviço de placeholder corrigida para não quebrar o servidor
        const placeholderService = await prisma.service.findFirst({ where: { companyId } });
        if (!placeholderService) {
            // Em vez de 'throw new Error', retornamos um erro 400 claro.
            return res.status(400).json({ message: "A sua empresa precisa de ter pelo menos um serviço cadastrado para poder vender pacotes." });
        }

        // 5. Transação segura para garantir a consistência dos dados
        const result = await prisma.$transaction(async (tx) => {
            // Cria a comanda para a venda do pacote
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

            // Cria a transação de entrada no caixa
            await tx.transaction.create({
                data: {
                    type: 'INCOME',
                    amount: pkg.price,
                    description: `Venda do Pacote: ${pkg.name}`,
                    cashierSessionId: activeCashier.id,
                    paymentMethod: paymentMethod || 'N/A', // Adicionado para consistência
                }
            });

            // Associa o pacote ao cliente de forma segura
            const validityDays = typeof pkg.validityDays === 'number' ? pkg.validityDays : 365;
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + validityDays);
            
            const clientPackage = await tx.clientPackage.create({
                data: {
                    sessionsRemaining: pkg.sessions,
                    expiresAt,
                    clientId,
                    packageId,
                    companyId, // Boa prática para multi-tenancy
                }
            });
            return clientPackage;
        });

        res.status(201).json(result);

    } catch (error) {
        console.error("--- ERRO AO VENDER PACOTE ---", error);
        // Retorna a mensagem de erro específica, se houver, senão uma genérica
        res.status(500).json({ message: error.message || 'Erro interno do servidor ao vender o pacote.' });
    }
};


// Suas outras funções (listClientPackages, usePackageSession, etc.)
export const listClientPackages = async (req, res) => {
    try {
        const { clientId } = req.params;
        const clientPackages = await prisma.clientPackage.findMany({
            where: { 
                clientId: clientId,
                companyId: req.company.id // Adicionando segurança
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
