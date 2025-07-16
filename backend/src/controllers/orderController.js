import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createOrder = async (req, res) => {
    const { companyId } = req.company;
    const { clientId, userId, items } = req.body; // items: [{ serviceId, quantity }]

    try {
        let total = 0;
        const orderItemsData = [];

        for (const item of items) {
            const service = await prisma.service.findFirst({ where: { id: item.serviceId, companyId } });
            if (!service) {
                return res.status(404).json({ message: `Serviço com id ${item.serviceId} não encontrado.` });
            }
            const itemPrice = service.price;
            total += Number(itemPrice) * item.quantity;
            orderItemsData.push({
                serviceId: item.serviceId,
                quantity: item.quantity,
                price: itemPrice,
            });
        }

        const newOrder = await prisma.order.create({
            data: {
                total,
                companyId,
                clientId,
                userId,
                items: { create: orderItemsData },
            },
            include: { items: true },
        });

        res.status(201).json(newOrder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao criar comanda.' });
    }
};

export const listOrders = async (req, res) => {
    const { companyId } = req.company;
    try {
        const orders = await prisma.order.findMany({
            where: { companyId },
            include: { client: true, user: true, items: { include: { service: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao listar comandas.' });
    }
}
// Implementar update e getById