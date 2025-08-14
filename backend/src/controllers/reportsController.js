import prisma from '../prismaClient.js';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

/** Já era seu: ajustei só o export */
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

/** NOVO: Relatório de aniversariantes por mês (month = 1..12) */
export const getBirthdaysReport = async (req, res) => {
  try {
    const companyId = req.company.id;
    const month = Number(req.query.month || 0); // 1..12; 0 => todos

    const clients = await prisma.client.findMany({
      where: { companyId, birthDate: { not: null } },
      select: { id: true, name: true, phone: true, email: true, birthDate: true },
      orderBy: { name: 'asc' },
    });

    const filtered = clients.filter(c => {
      if (!c.birthDate) return false;
      const m = c.birthDate.getUTCMonth() + 1;
      return month ? m === month : true;
    }).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      birthDate: c.birthDate.toISOString().slice(0, 10),
      month: c.birthDate.getUTCMonth() + 1,
      day: c.birthDate.getUTCDate(),
    }));

    res.json({ count: filtered.length, items: filtered });
  } catch (e) {
    console.error('Erro birthdays report:', e);
    res.status(500).json({ message: 'Erro ao buscar aniversariantes.' });
  }
};
