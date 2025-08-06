import prisma from '../prismaClient.js';
// LISTAR Comandas
export const listOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { companyId: req.company.id },
      include: {
        client: { select: { name: true } },
        user: { select: { name: true } },
        items: {
          include: {
            service: { select: { name: true } },
            product: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Erro ao listar comandas:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// CRIAR Comanda
export const createOrder = async (req, res) => {
  try {
    const { clientId, userId, items } = req.body;
    const companyId = req.company.id;

    if (!clientId || !userId || !items || items.length === 0) {
      return res.status(400).json({ message: "Cliente, colaborador e pelo menos um item são obrigatórios." });
    }

    let total = 0;
    const stockUpdates = [];
    const preparedItems = [];

    for (const item of items) {
      if (item.serviceId) {
        const service = await prisma.service.findUnique({ where: { id: item.serviceId } });
        if (!service) throw new Error(`Serviço com ID ${item.serviceId} não encontrado.`);
        total += Number(service.price) * item.quantity;
        preparedItems.push({
          quantity: item.quantity,
          price: Number(service.price),
          serviceId: item.serviceId,
        });
      } else if (item.productId) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Produto com ID ${item.productId} não encontrado.`);
        if (product.stock < item.quantity) throw new Error(`Stock insuficiente para o produto: ${product.name}.`);
        
        total += Number(product.price) * item.quantity;
        preparedItems.push({
          quantity: item.quantity,
          price: Number(product.price),
          productId: item.productId,
        });

        stockUpdates.push(
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        );
      }
    }

    const transactionResult = await prisma.$transaction([
      prisma.order.create({
        data: {
          total,
          status: 'OPEN',
          companyId,
          clientId,
          userId,
          items: { create: preparedItems },
        },
        include: { items: true }
      }),
      ...stockUpdates,
    ]);

    res.status(201).json(transactionResult[0]);
  } catch (error) {
    console.error("--- ERRO AO CRIAR COMANDA ---", error);
    res.status(400).json({ message: error.message || 'Erro ao criar comanda.' });
  }
};

// FINALIZAR Comanda (Lança no Caixa)
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

// CANCELAR Comanda (Devolve o stock)
export const cancelOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const orderToCancel = await prisma.order.findUnique({
            where: { id: id, companyId: req.company.id },
            include: { items: true },
        });

        if (!orderToCancel || orderToCancel.status !== 'OPEN') {
            return res.status(404).json({ message: "Apenas comandas abertas podem ser canceladas." });
        }
        
        const stockRestores = orderToCancel.items
            .filter(item => item.productId)
            .map(item => prisma.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
            }));

        await prisma.$transaction([
            ...stockRestores,
            prisma.order.update({
                where: { id: id },
                data: { status: 'CANCELED' },
            }),
        ]);

        res.status(200).json({ message: 'Comanda cancelada e stock devolvido com sucesso.' });
    } catch (error) {
        console.error("--- ERRO AO CANCELAR COMANDA ---", error);
        res.status(500).json({ message: "Erro ao cancelar comanda." });
    }
};