import { PrismaClient } from '@prisma/client';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

// Função para obter o resumo de dados do dashboard
export const getDashboardSummary = async (req, res) => {
  try {
    const companyId = req.company.id;
    const now = new Date();

    // Define os períodos de tempo
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // 1. Calcula o Faturamento de Hoje
    const revenueTodayResult = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        companyId,
        status: 'FINISHED',
        updatedAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });
    const revenueToday = revenueTodayResult._sum.total || 0;

    // 2. Calcula o número de Agendamentos de Hoje
    const appointmentsToday = await prisma.appointment.count({
      where: {
        companyId,
        start: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // 3. Calcula o número de Novos Clientes no Mês
    const newClientsThisMonth = await prisma.client.count({
      where: {
        companyId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Envia a resposta com todos os dados calculados
    res.status(200).json({
      revenueToday: Number(revenueToday),
      appointmentsToday,
      newClientsThisMonth,
    });

  } catch (error) {
    console.error("--- ERRO AO GERAR RESUMO DO DASHBOARD ---", error);
    res.status(500).json({ message: 'Erro ao gerar resumo do dashboard.' });
  }
};