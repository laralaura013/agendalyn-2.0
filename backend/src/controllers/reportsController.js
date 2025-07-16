import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getRevenueReport = async (req, res) => {
    const { companyId } = req.company;
    const { startDate, endDate } = req.query;

    try {
        const orders = await prisma.order.findMany({
            where: {
                companyId,
                status: 'FINISHED',
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });
        const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
        res.json({ totalRevenue, ordersCount: orders.length });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao gerar relatório de faturamento.' });
    }
};

// Implementar getRevenueByUserReport e getRevenueByServiceReport