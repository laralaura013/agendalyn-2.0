// backend/src/controllers/reportsController.js
import prisma from '../prismaClient.js';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

/**
 * GET /api/reports/revenue?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Retorna:
 *  - totalRevenue
 *  - revenueByStaff: [{ name, Faturamento }]
 *  - revenueByService: [{ name, value }]
 */
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
          include: { service: true, product: true }
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
          revenueByServiceMap[item.service.name] =
            (revenueByServiceMap[item.service.name] || 0) + (Number(item.price) * item.quantity);
        }
      });
    });

    const revenueByStaff   = Object.entries(revenueByStaffMap).map(([name, Faturamento]) => ({ name, Faturamento }));
    const revenueByService = Object.entries(revenueByServiceMap).map(([name, value]) => ({ name, value }));

    return res.status(200).json({ totalRevenue, revenueByStaff, revenueByService });
  } catch (error) {
    console.error("--- ERRO AO GERAR RELATÓRIO ---", error);
    return res.status(500).json({ message: "Erro ao gerar relatório." });
  }
};

/**
 * GET /api/reports/birthdays
 * Filtros:
 *  - month=1..12   (traz aniversariantes desse mês)
 *  - ou date_from=YYYY-MM-DD & date_to=YYYY-MM-DD (compara só mês-dia, qualquer ano)
 *  - q=... (busca no nome)
 *
 * Retorna: [{ id, name, birthDate, phone, email, age, birthdayDay, upcomingBirthday, daysToBirthday }]
 */
export const getBirthdaysReport = async (req, res) => {
  try {
    const companyId = req.company.id;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const q = req.query.q?.trim() || '';
    const dateFrom = req.query.date_from;
    const dateTo   = req.query.date_to;

    if (month && (month < 1 || month > 12)) {
      return res.status(400).json({ message: 'month deve ser 1..12.' });
    }

    // Busca clientes com birthDate não nulo (filtrando por nome no BD)
    const clients = await prisma.client.findMany({
      where: {
        companyId,
        birthDate: { not: null },
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, birthDate: true, phone: true, email: true }
    });

    const today = new Date();
    const toMMDD = (d) => {
      const m = `${d.getMonth() + 1}`.padStart(2, '0');
      const day = `${d.getDate()}`.padStart(2, '0');
      return `${m}-${day}`;
    };
    const parseYMD = (s) => {
      // 'YYYY-MM-DD'
      const d = new Date(s + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    };

    const fromDate = dateFrom ? parseYMD(dateFrom) : null;
    const toDate   = dateTo   ? parseYMD(dateTo)   : null;

    const fromMMDD = fromDate ? toMMDD(fromDate) : null;
    const toMMDDv  = toDate   ? toMMDD(toDate)   : null;

    const inRangeMMDD = (mmdd) => {
      if (month) {
        return Number(mmdd.slice(0, 2)) === month;
      }
      if (fromMMDD && toMMDDv) {
        // Comparação por string MM-DD (funciona porque ambas são zero-padded)
        if (fromMMDD <= toMMDDv) {
          return mmdd >= fromMMDD && mmdd <= toMMDDv;
        }
        // intervalo cruzando ano (ex.: 12-20 .. 01-10)
        return mmdd >= fromMMDD || mmdd <= toMMDDv;
      }
      return true; // sem filtro
    };

    const calcUpcoming = (birthDate) => {
      const b = new Date(birthDate);
      const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
      if (next < startOfDay(today)) {
        next.setFullYear(next.getFullYear() + 1);
      }
      return next;
    };
    const calcAge = (birthDate, ref = today) => {
      const b = new Date(birthDate);
      let age = ref.getFullYear() - b.getFullYear();
      const hasHad = (ref.getMonth() > b.getMonth()) ||
                     (ref.getMonth() === b.getMonth() && ref.getDate() >= b.getDate());
      if (!hasHad) age -= 1;
      return age;
    };

    const result = clients
      .map((c) => {
        const bd = new Date(c.birthDate);
        const mmdd = toMMDD(bd);
        return { ...c, _mmdd: mmdd };
      })
      .filter((c) => inRangeMMDD(c._mmdd))
      .map((c) => {
        const upcoming = calcUpcoming(c.birthDate);
        const daysTo = Math.ceil((upcoming - startOfDay(today)) / (1000 * 60 * 60 * 24));
        const birthdayDay = `${String(new Date(c.birthDate).getDate()).padStart(2, '0')}/${String(new Date(c.birthDate).getMonth() + 1).padStart(2, '0')}`;
        return {
          id: c.id,
          name: c.name,
          birthDate: c.birthDate,
          phone: c.phone,
          email: c.email,
          age: calcAge(c.birthDate, today),
          birthdayDay,
          upcomingBirthday: upcoming.toISOString(),
          daysToBirthday: daysTo,
        };
      })
      .sort((a, b) => a.daysToBirthday - b.daysToBirthday);

    return res.json(result);
  } catch (e) {
    console.error('Erro getBirthdaysReport:', e);
    return res.status(500).json({ message: 'Erro ao gerar relatório de aniversariantes.' });
  }
};
