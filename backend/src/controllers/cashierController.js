import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const openCashier = async (req, res) => {
    const { companyId } = req.company;
    const { openingBalance } = req.body;

    const openSession = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
    });
    if (openSession) {
        return res.status(409).json({ message: 'Já existe um caixa aberto.' });
    }

    const session = await prisma.cashierSession.create({
        data: { openingBalance, companyId },
    });
    res.status(201).json(session);
};

export const getCashierStatus = async (req, res) => {
    const { companyId } = req.company;
    const session = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
        include: { transactions: true }
    });

    if (!session) {
        return res.json({ status: 'CLOSED' });
    }
    res.json(session);
};

// Implementar closeCashier e addTransaction
