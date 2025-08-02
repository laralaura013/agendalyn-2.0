import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LISTAR CLIENTES (admin)
export const listClients = async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        companyId: req.company.id,
      },
    });
    res.status(200).json(clients);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// CRIAR CLIENTE (admin)
export const createClient = async (req, res) => {
  try {
    const { name, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    if (!name || !phone) {
      return res.status(400).json({ message: "Nome e telefone são obrigatórios." });
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        phone,
        birthDate,
        notes,
        companyId,
      },
    });

    res.status(201).json(newClient);
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// ATUALIZAR CLIENTE (admin)
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, birthDate, notes } = req.body;
    const companyId = req.company.id;

    const updated = await prisma.client.updateMany({
      where: { id, companyId },
      data: { name, phone, birthDate, notes },
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    res.status(200).json({ message: "Cliente atualizado com sucesso." });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// DELETAR CLIENTE (admin)
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.company.id;

    await prisma.client.deleteMany({
      where: { id, companyId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// HISTÓRICO DE AGENDAMENTOS (cliente autenticado)
export const getClientAppointmentHistory = async (req, res) => {
  try {
    const clientId = req.client.id;

    const history = await prisma.appointment.findMany({
      where: {
        clientId,
        status: {
          in: ['CONFIRMED', 'CANCELLED', 'FINISHED'],
        },
      },
      orderBy: { start: 'desc' },
      include: {
        service: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    res.json(history);
  } catch (error) {
    console.error("Erro ao buscar histórico do cliente:", error);
    res.status(500).json({ message: "Erro ao buscar histórico." });
  }
};

// NOTIFICAÇÕES DO CLIENTE (mock)
export const getClientNotifications = async (req, res) => {
  try {
    const clientId = req.client.id;

    const notifications = [
      {
        id: 1,
        title: 'Agendamento confirmado!',
        message: 'Seu horário foi confirmado para 28/07 às 14h.',
        createdAt: new Date(),
      },
      {
        id: 2,
        title: 'Promoção de pacote',
        message: 'Compre 5 sessões e ganhe +1 grátis até 31/07!',
        createdAt: new Date(new Date().setDate(new Date().getDate() - 1)),
      },
    ];

    res.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ message: "Erro ao buscar notificações." });
  }
};
