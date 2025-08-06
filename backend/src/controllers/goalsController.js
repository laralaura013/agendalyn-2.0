import prisma from '../prismaClient.js';
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

// --- FUNÇÃO LISTAR ATUALIZADA COM A CORREÇÃO ---
export const listGoals = async (req, res) => {
  try {
    const companyId = req.company.id;
    const goals = await prisma.goal.findMany({
      where: { companyId },
      include: {
        user: { select: { name: true } },
        service: { select: { name: true } },
      },
      // CORREÇÃO: O orderBy para múltiplos campos deve ser um array de objetos
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const startDate = startOfMonth(new Date(goal.year, goal.month - 1));
        const endDate = endOfMonth(new Date(goal.year, goal.month - 1));
        let currentValue = 0;

        const whereClause = {
          companyId,
          status: 'FINISHED',
          updatedAt: { gte: startDate, lte: endDate },
        };

        if (goal.type === 'BY_USER') {
          whereClause.userId = goal.userId;
        }

        if (goal.type === 'BY_SERVICE') {
            const orders = await prisma.order.findMany({ 
                where: whereClause, 
                include: { items: true } 
            });
            currentValue = orders.reduce((sum, order) => {
                const itemValue = order.items
                    .filter(item => item.serviceId === goal.serviceId)
                    .reduce((itemSum, item) => itemSum + (Number(item.price) * item.quantity), 0);
                return sum + itemValue;
            }, 0);
        } else {
            const result = await prisma.order.aggregate({
                _sum: { total: true },
                where: whereClause,
            });
            currentValue = result._sum.total || 0;
        }

        return { ...goal, currentValue: Number(currentValue) };
      })
    );

    res.status(200).json(goalsWithProgress);
  } catch (error) {
    console.error("--- ERRO AO LISTAR METAS ---", error);
    res.status(500).json({ message: "Erro ao listar metas." });
  }
};

// A função createGoal continua a mesma
export const createGoal = async (req, res) => {
    try {
        const { type, targetValue, month, year, userId, serviceId } = req.body;
        const data = {
            companyId: req.company.id,
            type,
            targetValue: parseFloat(targetValue),
            month: parseInt(month),
            year: parseInt(year),
            userId: type === 'BY_USER' ? userId : null,
            serviceId: type === 'BY_SERVICE' ? serviceId : null,
        };
        const newGoal = await prisma.goal.create({ data });
        res.status(201).json(newGoal);
    } catch (error) {
        console.error("--- ERRO AO CRIAR META ---", error);
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Já existe uma meta deste tipo para este período.' });
        }
        res.status(500).json({ message: "Erro ao criar meta." });
    }
};