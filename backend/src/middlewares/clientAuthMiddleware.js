import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const protectClient = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.clientId) {
        return res.status(401).json({ message: 'Token inválido. (sem clientId)' });
      }

      const client = await prisma.client.findUnique({
        where: { id: decoded.clientId },
      });

      if (!client) {
        return res.status(401).json({ message: 'Cliente não encontrado.' });
      }

      const company = await prisma.company.findUnique({
        where: { id: client.companyId },
      });

      if (!company || !company.isActive) {
        return res.status(403).json({ message: 'Empresa inativa ou não encontrada.' });
      }

      req.client = { id: client.id, companyId: client.companyId };
      next();
    } catch (error) {
      console.error('Erro no middleware protectClient:', error);
      return res.status(401).json({ message: 'Token inválido ou expirado.' });
    }
  } else {
    return res.status(401).json({ message: 'Não autorizado, sem token.' });
  }
};
