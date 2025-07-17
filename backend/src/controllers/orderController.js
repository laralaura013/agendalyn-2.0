import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// A função listOrders continua a mesma
export const listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { companyId: req.company.id },
      include: {
        client: { select: { name: true } },
        user: { select: { name: true } },
        items: { include: { service: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao listar comandas:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// A função createOrder continua a mesma
export const createOrder = async (req, res) => {
  try {
    const { clientId, userId, items } = req.body;
    const companyId = req.company.id;

    if (!clientId || !userId || !items || items.length === 0) {
      return res.status(400).json({ message: "Cliente, colaborador e pelo menos um item são obrigatórios." });
    }

    let total = 0;
    for (const item of items) {
        const service = await prisma.service.findUnique({ where: { id: item.serviceId } });
        if (!service) return res.status(404).json({ message: `Serviço com ID ${item.serviceId} não encontrado.` });
        total += Number(service.price) * item.quantity;
    }

    const newOrder = await prisma.order.create({
      data: {
        total,
        status: 'OPEN',
        companyId,
        clientId,
        userId,
        items: {
          create: items.map(item => ({
            quantity: item.quantity,
            price: Number(service.price), // Corrigido para salvar o preço do item
            serviceId: item.serviceId,
          })),
        },
      },
      include: { items: true }
    });
    res.status(201).json(newOrder);
  } catch (error) {
    console.error("--- ERRO AO CRIAR COMANDA ---", error);
    res.status(500).json({ message: 'Erro ao criar comanda.' });
  }
};

// --- NOVA FUNÇÃO PARA FINALIZAR A COMANDA ---
export const finishOrder = async (req, res) => {
    const { id } = req.params;
    const companyId = req.company.id;

    try {
        // 1. Encontra o caixa aberto para esta empresa
        const activeCashier = await prisma.cashierSession.findFirst({
            where: { companyId: companyId, status: 'OPEN' },
        });

        if (!activeCashier) {
            return res.status(400).json({ message: "Nenhum caixa aberto. Abra um caixa antes de finalizar a comanda." });
        }

        // 2. Garante que a comanda existe e está aberta
        const orderToFinish = await prisma.order.findUnique({
            where: { id: id, companyId: companyId }
        });

        if (!orderToFinish || orderToFinish.status !== 'OPEN') {
            return res.status(404).json({ message: "Comanda não encontrada ou já finalizada." });
        }

        // 3. Usa uma transação para garantir que as duas operações ocorram com sucesso
        await prisma.$transaction(async (tx) => {
            // Atualiza o status da comanda
            await tx.order.update({
                where: { id: id },
                data: { status: 'FINISHED' },
            });

            // Cria a transação de entrada no caixa
            await tx.transaction.create({
                data: {
                    type: 'INCOME',
                    amount: orderToFinish.total,
                    description: `Recebimento da comanda #${orderToFinish.id.substring(0, 8)}`,
                    cashierSessionId: activeCashier.id,
                },
            });
        });

        res.status(200).json({ message: "Comanda finalizada com sucesso!" });

    } catch (error) {
        console.error("--- ERRO AO FINALIZAR COMANDA ---", error);
        res.status(500).json({ message: 'Erro ao finalizar a comanda.' });
    }
};