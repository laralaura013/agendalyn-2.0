// src/controllers/dashboardController.js

import prisma from '../prismaClient.js';
import { PrismaClient } from '@prisma/client'
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  format
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const prisma = new PrismaClient()

export const getDashboardSummary = async (req, res) => {
  try {
    const companyId = req.company.id
    const now = new Date()

    // Limites SEM ajuste de fuso
    const todayStart = startOfDay(now)
    const todayEnd   = endOfDay(now)
    const monthStart = startOfMonth(now)
    const monthEnd   = endOfMonth(now)

    console.log('--- DEBUG DASHBOARD ---')
    console.log('todayStart:', todayStart.toISOString())
    console.log('todayEnd:  ', todayEnd.toISOString())

    // 1️⃣ Receita de Hoje (orders)
    const { _sum } = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        companyId,
        status: 'FINISHED',
        updatedAt: { gte: todayStart, lte: todayEnd },
      },
    })
    const revenueToday = _sum.total || 0

    // 2️⃣ Agendamentos de Hoje (appointments) — campo `start`
    const appointmentsToday = await prisma.appointment.count({
      where: {
        companyId,
        start: { gte: todayStart, lte: todayEnd },
      },
    })

    // 3️⃣ Novos Clientes neste Mês
    const newClientsThisMonth = await prisma.client.count({
      where: {
        companyId,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    })

    return res.status(200).json({
      revenueToday,
      appointmentsToday,
      newClientsThisMonth,
    })
  } catch (error) {
    console.error('--- ERRO AO GERAR RESUMO DO DASHBOARD ---', error)
    return res.status(500).json({ message: error.message })
  }
}

export const getMonthlyRevenue = async (req, res) => {
  try {
    const companyId = req.company.id

    // últimos 6 meses
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(new Date(), 5 - i)
      return {
        month: format(d, 'MMM', { locale: ptBR })
                 .replace('.', '')
                 .replace(/^\w/, (c) => c.toUpperCase()),
        start: startOfMonth(d),
        end:   endOfMonth(d),
      }
    })

    const data = await Promise.all(
      months.map(async ({ month, start, end }) => {
        const agg = await prisma.order.aggregate({
          _sum: { total: true },
          where: {
            companyId,
            status: 'FINISHED',
            updatedAt: { gte: start, lte: end },
          },
        })
        return { month, value: agg._sum.total || 0 }
      })
    )

    return res.json(data)
  } catch (error) {
    console.error('Erro ao calcular faturamento mensal:', error)
    return res.status(500).json({ message: error.message })
  }
}
