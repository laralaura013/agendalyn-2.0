// src/controllers/paymentMethodController.js
import prisma from '../prismaClient.js';

export const listPaymentMethods = async (req, res) => {
  try {
    const companyId = req.company.id;
    const onlyActive = String(req.query.active || '').toLowerCase() === 'true';

    const where = { companyId };
    if (onlyActive) where.active = true;

    const methods = await prisma.paymentMethod.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return res.status(200).json(methods);
  } catch (err) {
    console.error('Erro ao listar formas de pagamento:', err);
    return res.status(500).json({ message: 'Erro ao listar formas de pagamento.' });
  }
};

export const createPaymentMethod = async (req, res) => {
  try {
    const companyId = req.company.id;
    const name = (req.body?.name || '').trim();

    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório.' });
    }

    // garante unicidade por empresa
    const exists = await prisma.paymentMethod.findFirst({
      where: { companyId, name },
      select: { id: true },
    });
    if (exists) {
      return res.status(400).json({ message: 'Já existe uma forma de pagamento com esse nome.' });
    }

    const method = await prisma.paymentMethod.create({
      data: { companyId, name, active: true },
    });

    return res.status(201).json(method);
  } catch (err) {
    console.error('Erro ao criar forma de pagamento:', err);
    return res.status(500).json({ message: 'Erro ao criar forma de pagamento.' });
  }
};

export const updatePaymentMethod = async (req, res) => {
  try {
    const companyId = req.company.id;
    const { id } = req.params;
    const { name, active } = req.body || {};

    const method = await prisma.paymentMethod.findFirst({
      where: { id, companyId },
    });
    if (!method) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada.' });
    }

    // se for renomear, garantir unicidade
    if (typeof name === 'string' && name.trim() && name.trim() !== method.name) {
      const exists = await prisma.paymentMethod.findFirst({
        where: { companyId, name: name.trim(), NOT: { id } },
        select: { id: true },
      });
      if (exists) {
        return res.status(400).json({ message: 'Já existe outra forma de pagamento com esse nome.' });
      }
    }

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(typeof name === 'string' ? { name: name.trim() } : {}),
        ...(typeof active === 'boolean' ? { active } : {}),
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error('Erro ao atualizar forma de pagamento:', err);
    return res.status(500).json({ message: 'Erro ao atualizar forma de pagamento.' });
  }
};
