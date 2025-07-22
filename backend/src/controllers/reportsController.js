import { PrismaClient } from '@prisma/client';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

// Relatório de Receitas
export const getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const companyId = req.company.id;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "As datas de início e fim são obrigatórias." });
        }

        const finishedOrders = await prisma.order.findMany({
            where: {
                companyId,
                status: 'FINISHED',
                updatedAt: {
                    gte: startOfDay(parseISO(startDate)),
                    lte: endOfDay(parseISO(endDate)),
                }
            },
            include: {
                items: {
                    include: {
                        service: true,
                        product: true,
                    }
                }
            }
        });

        const totalRevenue = finishedOrders.reduce((sum, order) => sum + Number(order.total), 0);
        const totalOrders = finishedOrders.length;
        const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const salesByType = { services: 0, products: 0 };
        const salesByItem = {};

        finishedOrders.forEach(order => {
            order.items.forEach(item => {
                // --- AQUI ESTÁ A CORREÇÃO ---
                // Verificamos se o serviço ou produto ainda existe antes de o processar.
                if (item.service) {
                    const itemName = item.service.name;
                    salesByType.services += Number(item.price) * item.quantity;
                    salesByItem[itemName] = (salesByItem[itemName] || 0) + (Number(item.price) * item.quantity);
                } else if (item.product) {
                    const itemName = item.product.name;
                    salesByType.products += Number(item.price) * item.quantity;
                    salesByItem[itemName] = (salesByItem[itemName] || 0) + (Number(item.price) * item.quantity);
                }
                // Se nem item.service nem item.product existirem, o item é ignorado.
            });
        });

        const topItems = Object.entries(salesByItem)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, revenue]) => ({ name, revenue }));

        res.status(200).json({
            totalRevenue,
            totalOrders,
            averageTicket,
            salesByType,
            topItems,
        });

    } catch (error) {
        console.error("--- ERRO AO GERAR RELATÓRIO ---", error);
        res.status(500).json({ message: "Erro ao gerar relatório." });
    }
};