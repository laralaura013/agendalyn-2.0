import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createPackage = async (req, res) => {
    const { companyId } = req.company;
    const { name, price, sessions, validityDays, serviceIds } = req.body;
    try {
        const newPackage = await prisma.package.create({
            data: {
                name, price, sessions, validityDays, companyId,
                services: { connect: serviceIds.map(id => ({ id })) }
            }
        });
        res.status(201).json(newPackage);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar pacote.' });
    }
};

// Implementar listPackages, sellPackageToClient, usePackageSession