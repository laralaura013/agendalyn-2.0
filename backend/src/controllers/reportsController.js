import { PrismaClient } from '@prisma/client';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

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
                },
                user: true,
            }
        });

        const totalRevenue = finishedOrders.reduce((sum, order) => sum + Number(order.total), 0);
        
        const revenueByStaffMap = {};
        const revenueByServiceMap = {};

        finishedOrders.forEach(order => {
            if (order.user) {
                revenueByStaffMap[order.user.name] = (revenueByStaffMap[order.user.name] || 0) + Number(order.total);
            }
            order.items.forEach(item => {
                if (item.service) {
                    revenueByServiceMap[item.service.name] = (revenueByServiceMap[item.service.name] || 0) + (Number(item.price) * item.quantity);
                }
            });
        });

        // --- AQUI ESTÁ A CORREÇÃO ---
        const revenueByStaff = Object.entries(revenueByStaffMap).map(([name, Faturamento]) => ({ name, Faturamento }));
        const revenueByService = Object.entries(revenueByServiceMap).map(([name, value]) => ({ name, value }));

        res.status(200).json({
            totalRevenue,
            revenueByStaff,
            revenueByService,
        });

    } catch (error) {
        console.error("--- ERRO AO GERAR RELATÓRIO ---", error);
        res.status(500).json({ message: "Erro ao gerar relatório." });
    }
};