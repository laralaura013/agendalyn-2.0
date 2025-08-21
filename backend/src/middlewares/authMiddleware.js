// src/middlewares/authMiddleware.js
import jwt from 'jsonwebtoken';

/** Util: pega header Authorization de forma robusta */
function getAuthHeader(req) {
  return (
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.get?.('Authorization') ||
    ''
  );
}

/** Util: extrai token do header/cookie */
function extractToken(req) {
  const auth = getAuthHeader(req);
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim();
  }
  // Fallback por cookies (opcional)
  const cookieHeader = req.headers?.cookie || '';
  // Busca tokens simples "token=" ou "clientToken="
  const cookieToken =
    /(?:^|;\s*)token=([^;]+)/.exec(cookieHeader)?.[1] ||
    /(?:^|;\s*)clientToken=([^;]+)/.exec(cookieHeader)?.[1];
  return cookieToken || null;
}

/** Util: resolve companyId a partir do token ou de fallbacks */
function resolveCompanyId(decoded, req) {
  // 1) do token (recomendado)
  if (decoded?.companyId) return decoded.companyId;

  // 2) header customizado
  const headerCompany =
    req.headers['x-company-id'] ||
    req.headers['X-Company-Id'] ||
    req.headers['x-companyid'];

  if (headerCompany && String(headerCompany).trim()) {
    return String(headerCompany).trim();
  }

  // 3) query param (?companyId=...)
  if (req.query?.companyId) {
    return String(req.query.companyId).trim();
  }

  return null;
}

/** Util: valida existência do secret */
function ensureJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET não definido nas variáveis de ambiente. Configure process.env.JWT_SECRET.'
    );
  }
}

/** Middleware: proteção para usuários ADMIN/OWNER (painel administrativo) */
export const protect = (req, res, next) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') return next();

    ensureJwtSecret();

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Não autorizado, token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Esperado no token: { id, role, companyId }
    const companyId = resolveCompanyId(decoded, req);

    if (!companyId) {
      return res.status(401).json({
        message:
          'Não autorizado: companyId ausente. Verifique o token (companyId) ou envie X-Company-Id / ?companyId=.',
      });
    }

    // Anexa contexto
    req.user = {
      id: decoded?.id,
      role: decoded?.role || 'STAFF',
      email: decoded?.email,
    };
    req.company = { id: companyId };

    return next();
  } catch (error) {
    console.error('[AUTH][protect] Erro de autenticação:', error?.message);
    return res.status(401).json({ message: 'Não autorizado, token inválido.' });
  }
};

/** Middleware: proteção para CLIENTE (portal do cliente) */
export const protectClient = (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') return next();

    ensureJwtSecret();

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Não autorizado, token do cliente não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Esperado no token: { clientId, companyId, role?: "CLIENT" }
    const companyId = resolveCompanyId(decoded, req);

    if (!decoded?.clientId) {
      return res.status(401).json({ message: 'Token inválido: clientId ausente.' });
    }
    if (!companyId) {
      return res.status(401).json({
        message:
          'Token inválido: companyId ausente. Envie X-Company-Id ou ?companyId= quando necessário.',
      });
    }

    req.client = {
      id: decoded.clientId,
      name: decoded?.name,
      email: decoded?.email,
    };
    req.company = { id: companyId };

    return next();
  } catch (error) {
    console.error('[AUTH][protectClient] Erro de autenticação:', error?.message);
    return res.status(401).json({ message: 'Não autorizado, token do cliente inválido.' });
  }
};

/**
 * Middleware: verificação de papel (ADMIN/OWNER/STAFF etc.)
 * Uso: router.get('/rota', protect, checkRole(['ADMIN','OWNER']), handler)
 */
export const checkRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req?.user?.role) {
        return res
          .status(401)
          .json({ message: 'Não autorizado: usuário não autenticado.' });
      }
      if (!Array.isArray(roles) || roles.length === 0) {
        return next(); // se não especificar papéis, deixa passar
      }
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          message: 'Acesso negado. Você não tem permissão para realizar esta ação.',
        });
      }
      return next();
    } catch (error) {
      console.error('[AUTH][checkRole] erro:', error?.message);
      return res.status(500).json({ message: 'Erro ao validar permissão.' });
    }
  };
};
