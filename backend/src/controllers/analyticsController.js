// src/controllers/analyticsController.js
import * as svc from '../services/analyticsService.js';

export async function getPerformance(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    const { unitId=null, staffId=null, serviceId=null, from, to, groupBy='day' } = req.query;
    const data = await svc.performanceOverview({ companyId, unitId, staffId, serviceId, from, to, groupBy });
    res.json(data);
  } catch (err) {
    console.error('getPerformance error:', err);
    res.status(500).json({ message: 'Erro ao carregar performance', error: String(err?.message || err) });
  }
}

export async function getProjection(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    const { unitId=null, staffId=null, months=3 } = req.query;
    const data = await svc.revenueProjection({ companyId, unitId, staffId, months: Number(months)||3 });
    res.json(data);
  } catch (err) {
    console.error('getProjection error:', err);
    res.status(500).json({ message: 'Erro ao projetar receita', error: String(err?.message || err) });
  }
}

export async function getBarberBreakdown(req, res) {
  try {
    const companyId = req.company?.id || req.user?.companyId;
    const { from, to, unitId=null } = req.query;
    const data = await svc.barberBreakdown({ companyId, unitId, from, to });
    res.json(data);
  } catch (err) {
    console.error('getBarberBreakdown error:', err);
    res.status(500).json({ message: 'Erro ao carregar ranking de barbeiros', error: String(err?.message || err) });
  }
}
