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

    // 1️⃣ Receita de hoje (agendamentos)
    const revenueTodayResult = await prisma.appointment.aggregate({
      _sum: { price: true },        // ajuste "price" conforme seu schema
      where: {
        companyId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: 'CONFIRMED'         // ajuste status se necessário
      },
    })
    const revenueToday = revenueTodayResult._sum.price || 0

    // 2️⃣ Agendamentos hoje
    const appointmentsToday = await prisma.appointment.count({
      where: {
        companyId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    // 3️⃣ Clientes novos neste mês
    const newClientsThisMonth = await prisma.client.count({
      where: {
        companyId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    })

    return res.status(200).json({
      revenueToday,
      appointmentsToday,
      newClientsThisMonth,
    })

  } catch (error) {
    console.error('--- ERRO AO GERAR RESUMO DO DASHBOARD ---', error)
    return res
      .status(500)
      .json({ message: error.message })
  }
}

export const getMonthlyRevenue = async (req, res) => {
  try {
    const companyId = req.company.id

    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = subMonths(new Date(), 5 - i)
      return {
        month: format(date, 'MMM', { locale: ptBR }).replace('.', '').replace(/^\w/, c => c.toUpperCase()),
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
            updatedAt: {
              gte: start,
              lte: end,
            },
          },
        })
        return {
          month,
          value: agg._sum.total || 0,
        }
      })
    )

    return res.status(200).json(data)

  } catch (error) {
    console.error('Erro ao calcular faturamento mensal:', error)
    return res
      .status(500)
      .json({ message: error.message })
  }
}
