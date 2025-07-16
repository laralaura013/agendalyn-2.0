import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createAnamnesisForm = async (req, res) => {
    const { companyId } = req.company;
    const { title, questions } = req.body;
    try {
        const form = await prisma.anamnesisForm.create({
            data: { title, questions, companyId }
        });
        res.status(201).json(form);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar ficha de anamnese.' });
    }
};

// Implementar listAnamnesisForms, saveAnamnesisAnswer, getClientAnamnesisHistory
