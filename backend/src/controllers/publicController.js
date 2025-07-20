import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Buscar dados públicos de uma empresa para a página de agendamento
export const getBookingPageData = async (req, res) => {
    try {
        const { companyId } = req.params;
        // 1. Busca os dados da empresa
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: {
                name: true,
                phone: true,
                address: true,
            }
        });
        if (!company) {
            return res.status(404).json({ message: "Estabelecimento não encontrado." });
        }

        // 2. Busca os serviços da empresa
        const services = await prisma.service.findMany({
            where: { companyId: companyId },
            select: { id: true, name: true, price: true, duration: true }
        });
        // 3. Busca os colaboradores que estão visíveis para agendamento
        const staff = await prisma.user.findMany({
            where: {
                companyId: companyId,
                showInBooking: true // Apenas os que estão marcados como visíveis
            },
            select: { id: true, name: true }
        });
        res.status(200).json({
            company,
            services,
            staff
        });
    } catch (error) {
        console.error("--- ERRO AO BUSCAR DADOS PÚBLICOS ---", error);
        res.status(500).json({ message: "Erro ao carregar dados da página de agendamento." });
    }
};