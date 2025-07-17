import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const prisma = new PrismaClient();

export const getRevenueReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const companyId = req.company.id;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "As datas de início e fim são obrigatórias." });
        }

        const parsedStartDate = startOfDay(parseISO(startDate));
        const parsedEndDate = endOfDay(parseISO(endDate));

        // Encontra todas as comandas finalizadas no período
        const finishedOrders = await prisma.order.findMany({
            where: {
                companyId: companyId,
                status: 'FINISHED',
                updatedAt: { // Filtra por quando a comanda foi finalizada
                    gte: parsedStartDate,
                    lte: parsedEndDate,
                },
            },
            include: {
                user: { select: { name: true } }, // Para o relatório por colaborador
                items: { // Para o relatório por serviço
                    include: {
                        service: { select: { name: true, price: true } },
                    }
                }
            }
        });

        // 1. Calcula o Faturamento Total
        const totalRevenue = finishedOrders.reduce((sum, order) => sum + Number(order.total), 0);

        // 2. Agrupa o Faturamento por Colaborador
        const revenueByStaff = finishedOrders.reduce((acc, order) => {
            const staffName = order.user.name;
            acc[staffName] = (acc[staffName] || 0) + Number(order.total);
            return acc;
        }, {});

        // 3. Agrupa o Faturamento por Serviço
        const revenueByService = finishedOrders.reduce((acc, order) => {
            order.items.forEach(item => {
                const serviceName = item.service.name;
                const itemTotal = Number(item.price) * item.quantity;
                acc[serviceName] = (acc[serviceName] || 0) + itemTotal;
            });
            return acc;
        }, {});

        // Formata os dados para os gráficos do Recharts
        const formattedRevenueByStaff = Object.entries(revenueByStaff).map(([name, value]) => ({ name, Faturamento: value }));
        const formattedRevenueByService = Object.entries(revenueByService).map(([name, value]) => ({ name, value }));

        res.status(200).json({
            totalRevenue,
            revenueByStaff: formattedRevenueByStaff,
            revenueByService: formattedRevenueByService,
        });

    } catch (error) {
        console.error("--- ERRO AO GERAR RELATÓRIO ---", error);
        res.status(500).json({ message: 'Erro ao gerar relatório.' });
    }
};