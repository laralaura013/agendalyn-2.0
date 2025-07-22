import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const protectClient = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.client = await prisma.client.findUnique({ where: { id: decoded.clientId } });
            
            if (!req.client) {
                return res.status(401).json({ message: 'Cliente não encontrado.' });
            }
            next();
        } catch (error) {
            res.status(401).json({ message: 'Não autorizado, token falhou.' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Não autorizado, sem token.' });
    }
};