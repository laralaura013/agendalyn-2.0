import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 🔐 Gera token com clientId (usado pelo middleware)
const generateToken = (clientId) => {
  return jwt.sign({ clientId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// ✅ Registro do cliente
export const registerClient = async (req, res) => {
  const { name, email, password, companyId } = req.body;

  try {
    const existing = await prisma.client.findFirst({
      where: { email, companyId },
    });

    if (existing) {
      return res.status(400).json({ message: 'Cliente já existe com este e-mail' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await prisma.client.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyId,
      },
    });

    const token = generateToken(client.id);

    res.status(201).json({
      token,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        companyId: client.companyId,
      },
    });
  } catch (error) {
    console.error('Erro no registro do cliente:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

// ✅ Login do cliente
export const loginClient = async (req, res) => {
  const { email, password } = req.body;

  try {
    const client = await prisma.client.findUnique({ where: { email } });

    if (!client) {
      return res.status(401).json({ message: 'Cliente não encontrado' });
    }

    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Senha incorreta' });
    }

    const token = generateToken(client.id);

    res.status(200).json({
      token,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        companyId: client.companyId,
      },
    });
  } catch (error) {
    console.error('Erro no login do cliente:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

// ✅ Listar agendamentos do cliente autenticado
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { clientId: req.client.id },
      include: {
        service: true,
        staff: true,
      },
      orderBy: { date: 'desc' },
    });

    res.json(appointments);
  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    res.status(500).json({ message: 'Erro ao carregar agendamentos.' });
  }
};

// ✅ Listar pacotes do cliente autenticado
export const getMyPackages = async (req, res) => {
  try {
    const packages = await prisma.packagePurchase.findMany({
      where: { clientId: req.client.id },
      include: {
        package: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(packages);
  } catch (error) {
    console.error('Erro ao carregar pacotes:', error);
    res.status(500).json({ message: 'Erro ao carregar pacotes.' });
  }
};

// ✅ Cancelar um agendamento do cliente
export const cancelAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment || appointment.clientId !== req.client.id) {
      return res.status(403).json({ message: 'Agendamento não encontrado ou não autorizado.' });
    }

    await prisma.appointment.delete({ where: { id } });

    res.json({ message: 'Agendamento cancelado com sucesso.' });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ message: 'Erro ao cancelar agendamento.' });
  }
};
