// backend/src/routes/analyticsRoutes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import {
  getPerformance,
  getBarberBreakdown,
  getProjection,
} from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * Autenticação:
 * - Se um middleware anterior já populou req.user, usamos.
 * - Se não, tentamos decodificar Authorization: Bearer <token> com JWT_SECRET.
 */
router.use((req, res, next) => {
  try {
    if (!req.user) {
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice(7);
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // Esperado no token: id, companyId, role
        req.user = {
          id: payload.id,
          companyId: payload.companyId,
          role: payload.role,
        };
      }
    }
  } catch (e) {
    // token inválido/expirado -> segue para o 401 abaixo
  }

  if (!req.user?.id || !req.user?.companyId) {
    return res.status(401).json({ message: 'Não autenticado.' });
  }
  next();
});

const ADMINS = ['OWNER', 'ADMIN', 'MANAGER'];
const STAFFS = ['STAFF', 'BARBER', 'HAIRDRESSER'];

/** ------------------------------------------------------------------ **
 * /api/analytics/performance
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
