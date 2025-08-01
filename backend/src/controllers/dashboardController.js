// src/controllers/dashboardController.js

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

// Ajusta horário de Brasília (UTC-3) para UTC
const toUtcFromBrazil = (date) =>
  new Date(date.getTime() + 3 * 60 * 60 * 1000)

export const getDashboardSummary = async (req, res) => {
  try {
    const companyId = req.company.id
    const now = new Date()

    const todayStart = toUtcFromBrazil(startOfDay(now))
    const todayEnd   = toUtcFromBrazil(endOfDay(now))
    const monthStart = toUtcFromBrazil(startOfMonth(now))
    const monthEnd   = toUtcFromBrazil(endOfMonth(now))

    console.log('--- DEBUG DASHBOARD ---')
    console.log('todayStart:', todayStart.toISOString())
    console.log('todayEnd:  ', todayEnd.toISOString())
    console.log('monthStart:', monthStart.toISOString())
    console.log('monthEnd:  ', monthEnd.toISOString())

    // 1️⃣ Receita de Hoje (orders)
    const revenueTodayResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        companyId,
        status: 'FINISHED',
        updatedAt: { gte: todayStart, lte: todayEnd },
      },
    })
    const revenueToday = revenueTodayResult._sum.total || 0

    // 2️⃣ Agendamentos de Hoje (appointments) — usa o campo `start`
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
      const date = subMonths(new Date(), 5 - i)
      return {
        month: format(date, 'MMM', { locale: ptBR })
                 .replace('.', '')
                 .replace(/^\w/, c => c.toUpperCase()),
        start: toUtcFromBrazil(startOfMonth(date)),
        end:   toUtcFromBrazil(endOfMonth(date)),
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
