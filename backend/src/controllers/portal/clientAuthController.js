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
  const { name, email, password, companyId, phone } = req.body;

  if (!name || !email || !password || !companyId || !phone) {
    return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    // Valida empresa ativa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.isActive) {
      return res.status(400).json({ message: 'Empresa inativa ou não encontrada.' });
    }

    const existing = await prisma.client.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        companyId,
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Cliente já existe com este e-mail.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await prisma.client.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
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
        phone: client.phone,
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
  const { email, password, companyId } = req.body;

  try {
    // Valida empresa ativa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.isActive) {
      return res.status(400).json({ message: 'Empresa inativa ou não encontrada.' });
    }

    const client = await prisma.client.findUnique({
      where: {
        companyId_email: {
          email,
          companyId,
        },
      },
    });

    if (!client) {
      return res.status(401).json({ message: 'Cliente não encontrado.' });
    }

    const isMatch = await bcrypt.compare(password, client.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }

    const token = generateToken(client.id);

    res.status(200).json({
      token,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
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
        user: true,
      },
      orderBy: { start: 'desc' },
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
    const packages = await prisma.clientPackage.findMany({
      where: { clientId: req.client.id },
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


// ✅ Atualizar perfil do cliente autenticado
export const updateClientProfile = async (req, res) => {
  const { name, phone, password } = req.body;

  try {
    const data = { name, phone };

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      data.password = hashed;
    }

    const updated = await prisma.client.update({
      where: { id: req.client.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyId: true,
      },
    });

    res.json({ message: 'Perfil atualizado com sucesso.', client: updated });
  } catch (error) {
    console.error('Erro ao atualizar perfil do cliente:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  }
};
