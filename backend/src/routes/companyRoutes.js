import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Rota protegida de exemplo para buscar o perfil da empresa logada
// GET /api/company/profile
router.get('/profile', protect, async (req, res) => {
  try {
    // O ID da empresa é obtido do token, via middleware `protect`
    const companyId = req.company.id;

    const companyProfile = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: { // Exemplo: retorna os usuários da empresa
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });

    if (!companyProfile) {
      return res.status(404).json({ message: 'Empresa não encontrada.' });
    }

    res.json(companyProfile);
  } catch (error) {
    console.error("Erro ao buscar perfil da empresa:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

export default router;
