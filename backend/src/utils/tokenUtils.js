import jwt from 'jsonwebtoken';

/**
 * Gera o Access Token (curta duração).
 * Usado para autorizar o acesso às rotas protegidas.
 * @param {object} user - O objeto do usuário contendo id, companyId e role.
 * @returns {string} O token de acesso gerado.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, companyId: user.companyId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Expira em 15 minutos para maior segurança
  );
}

/**
 * Gera o Refresh Token (longa duração).
 * Usado para obter um novo Access Token sem precisar fazer login novamente.
 * @param {object} user - O objeto do usuário contendo id e companyId.
 * @returns {string} O token de atualização gerado.
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, companyId: user.companyId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' } // Expira em 7 dias
  );
}