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

// --- FUNÇÃO CRIAR COMANDA CORRIGIDA ---
export const createOrder = async (req, res) => {
  try {
    const { clientId, userId, items } = req.body;
    const companyId = req.company.id;

    if (!clientId || !userId || !items || items.length === 0) {
      return res.status(400).json({ message: "Cliente, colaborador e pelo menos um item são obrigatórios." });
    }

    // 1. Pega os IDs de todos os serviços na comanda
    const serviceIds = items.map(item => item.serviceId);

    // 2. Busca todos os serviços do banco de dados de uma só vez para ser mais eficiente
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        companyId: companyId, // Garante que os serviços são da mesma empresa
      },
    });

    // Mapeia os serviços por ID para fácil acesso
    const servicesMap = new Map(services.map(s => [s.id, s]));

    // 3. Valida os itens, prepara os dados para o banco e calcula o total
    let total = 0;
    const preparedItems = items.map(item => {
      const service = servicesMap.get(item.serviceId);
      if (!service) {
        // Lança um erro que será capturado pelo catch block
        throw new Error(`Serviço com ID ${item.serviceId} não encontrado.`);
      }
      total += Number(service.price) * item.quantity;

      return {
        quantity: item.quantity,
        price: Number(service.price), // Agora o preço unitário correto é salvo
        serviceId: item.serviceId,
      };
    });

    // 4. Cria a comanda e seus itens no banco de dados em uma única operação
    const newOrder = await prisma.order.create({
      data: {
        total,
        status: 'OPEN',
        companyId,
        clientId,
        userId,
        items: {
          create: preparedItems, // Usa os itens preparados com o preço correto
        },
      },
      include: {
        items: true,
      }
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("--- ERRO AO CRIAR COMANDA ---", error);
    // Retorna a mensagem de erro específica (ex: serviço não encontrado) para o frontend
    res.status(400).json({ message: error.message || 'Erro ao criar comanda.' });
  }
};

// A função finishOrder continua a mesma
export const finishOrder = async (req, res) => {
    const { id } = req.params;
    const companyId = req.company.id;

    try {
        const activeCashier = await prisma.cashierSession.findFirst({
            where: { companyId: companyId, status: 'OPEN' },
        });

        if (!activeCashier) {
            return res.status(400).json({ message: "Nenhum caixa aberto. Abra um caixa antes de finalizar a comanda." });
        }

        const orderToFinish = await prisma.order.findUnique({
            where: { id: id, companyId: companyId }
        });

        if (!orderToFinish || orderToFinish.status !== 'OPEN') {
            return res.status(404).json({ message: "Comanda não encontrada ou já finalizada." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: id },
                data: { status: 'FINISHED' },
            });

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