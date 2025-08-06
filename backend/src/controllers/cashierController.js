import prisma from '../prismaClient.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// OBTER STATUS do Caixa
export const getCashierStatus = async (req, res) => {
  try {
    const activeSession = await prisma.cashierSession.findFirst({
      where: {
        companyId: req.company.id,
        status: 'OPEN',
      },
      include: {
        transactions: true, // Inclui as transações do turno
      },
    });

    if (activeSession) {
      res.status(200).json({ isOpen: true, session: activeSession });
    } else {
      res.status(200).json({ isOpen: false, session: null });
    }
  } catch (error) {
    console.error("Erro ao buscar status do caixa:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// ABRIR um novo Caixa/Turno
export const openCashier = async (req, res) => {
  try {
    const { openingBalance } = req.body;
    const companyId = req.company.id;

    // Verifica se já não há um caixa aberto
    const existingOpenSession = await prisma.cashierSession.findFirst({
        where: { companyId, status: 'OPEN' },
    });

    if (existingOpenSession) {
        return res.status(409).json({ message: "Já existe um caixa aberto." });
    }

    const newSession = await prisma.cashierSession.create({
      data: {
        openingBalance: parseFloat(openingBalance) || 0,
        status: 'OPEN',
        companyId,
      },
    });
    res.status(201).json(newSession);
  } catch (error) {
    console.error("--- ERRO AO ABRIR CAIXA ---", error);
    res.status(500).json({ message: 'Erro ao abrir caixa.' });
  }
};

// FECHAR o Caixa/Turno
export const closeCashier = async (req, res) => {
    try {
        const companyId = req.company.id;
        const activeSession = await prisma.cashierSession.findFirst({
            where: { companyId, status: 'OPEN' },
            include: { transactions: true },
        });

        if (!activeSession) {
            return res.status(404).json({ message: "Nenhum caixa aberto para fechar." });
        }

        // Calcula o saldo final
        const totalIncome = activeSession.transactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const totalExpense = activeSession.transactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const closingBalance = Number(activeSession.openingBalance) + totalIncome - totalExpense;

        const closedSession = await prisma.cashierSession.update({
            where: { id: activeSession.id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closingBalance: closingBalance,
            },
        });

        res.status(200).json(closedSession);

    } catch (error) {
        console.error("--- ERRO AO FECHAR CAIXA ---", error);
        res.status(500).json({ message: 'Erro ao fechar caixa.' });
    }
};