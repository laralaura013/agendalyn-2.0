import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createGoal = async (req, res) => {
    const { companyId } = req.company;
    const { type, targetValue, month, year, userId, serviceId } = req.body;
    try {
        const newGoal = await prisma.goal.create({
            data: { type, targetValue, month, year, companyId, userId, serviceId },
        });
        res.status(201).json(newGoal);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar meta.' });
    }
};

// Implementar listGoals com cálculo de progresso
