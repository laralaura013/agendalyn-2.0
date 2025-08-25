// backend/src/routes/analyticsRoutes.js
import express from 'express';
import {
  getPerformance,
  getBarberBreakdown,
  getProjection,
} from '../controllers/analyticsController.js';

const router = express.Router();

// Exige usuário autenticado (assumindo que um auth middleware anterior popula req.user)
router.use((req, res, next) => {
  if (!req.user?.id || !req.user?.companyId) {
    return res.status(401).json({ message: 'Não autenticado.' });
  }
  next();
});

const ADMINS = ['OWNER', 'ADMIN', 'MANAGER'];
const STAFFS = ['STAFF', 'BARBER', 'HAIRDRESSER'];

/** ------------------------------------------------------------------ **
 * /api/analytics/performance
 * Admins veem a empresa toda; Staff/Barber/Hairdresser veem apenas o próprio userId
 ** ------------------------------------------------------------------ */
router.get('/performance', (req, res, next) => {
  const role = req.user.role;
  if (ADMINS.includes(role)) {
    return getPerformance(req, res, next);
  }
  if (STAFFS.includes(role)) {
    req.query.userId = req.user.id; // escopo ao próprio
    return getPerformance(req, res, next);
  }
  return res.status(403).json({ message: 'Sem permissão.' });
});

/** ------------------------------------------------------------------ **
 * /api/analytics/barbers
 * Admins: ranking completo; Staff/Barber/Hairdresser: somente seus próprios números
 ** ------------------------------------------------------------------ */
router.get('/barbers', (req, res, next) => {
  const role = req.user.role;
  if (ADMINS.includes(role)) {
    return getBarberBreakdown(req, res, next);
  }
  if (STAFFS.includes(role)) {
    req.query.userId = req.user.id; // somente o próprio
    return getBarberBreakdown(req, res, next);
  }
  return res.status(403).json({ message: 'Sem permissão.' });
});

/** ------------------------------------------------------------------ **
 * /api/analytics/projection
 * Admins: projeção da empresa; Staff/Barber/Hairdresser: projeção do próprio
 ** ------------------------------------------------------------------ */
router.get('/projection', (req, res, next) => {
  const role = req.user.role;
  if (ADMINS.includes(role)) {
    return getProjection(req, res, next);
  }
  if (STAFFS.includes(role)) {
    req.query.userId = req.user.id; // escopo ao próprio
    return getProjection(req, res, next);
  }
  return res.status(403).json({ message: 'Sem permissão.' });
});

export default router;
