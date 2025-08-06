import prisma from '../prismaClient.js';
import { PrismaClient } from '@prisma/client';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export const getCommissionReport = async (req, res) => {
    try {
        const { staffId, startDate, endDate } = req.query;
        const companyId = req.company.id;

        if (!staffId || !startDate || !endDate) {
            return res.status(400).json({ message: "Colaborador e período são obrigatórios." });
        }

        // 1. Busca o colaborador para obter a sua taxa de comissão
        const staffMember = await prisma.user.findUnique({
            where: { id: staffId }
        });

        if (!staffMember || !staffMember.commission) {
            return res.status(200).json({
                totalSales: 0,
                commissionRate: 0,
                totalCommission: 0,
                orders: [],
                staffName: staffMember?.name || 'Desconhecido'
            });
        }

        const commissionRate = Number(staffMember.commission);

        // 2. Busca todas as comandas finalizadas para o colaborador no período
        const orders = await prisma.order.findMany({
            where: {
                companyId,
                userId: staffId,
                status: 'FINISHED',
                updatedAt: {
                    gte: startOfDay(parseISO(startDate)),
                    lte: endOfDay(parseISO(endDate)),
                }
            },
            include: {
                client: { select: { name: true } }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // 3. Calcula o total vendido e a comissão
        const totalSales = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const totalCommission = totalSales * (commissionRate / 100);

        res.status(200).json({
            totalSales,
            commissionRate,
            totalCommission,
            orders,
            staffName: staffMember.name
        });

    } catch (error) {
        console.error("--- ERRO AO GERAR RELATÓRIO DE COMISSÃO ---", error);
        res.status(500).json({ message: "Erro ao gerar relatório de comissão." });
    }
};