import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// LISTAR Serviços
export const listServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ where: { companyId: req.company.id } });
    res.status(200).json(services);
  } catch (error) {
    console.error("Erro ao listar serviços:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// CRIAR Serviço
export const createService = async (req, res) => {
  try {
    const { name, price, duration } = req.body;
    const newService = await prisma.service.create({
      data: { 
        name, 
        price: parseFloat(price), 
        duration: parseInt(duration), 
        companyId: req.company.id 
      },
    });
    res.status(201).json(newService);
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    res.status(500).json({ message: 'Erro ao criar serviço.' });
  }
};

// ATUALIZAR (EDITAR) Serviço
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, duration } = req.body;
        const updatedService = await prisma.service.update({
            where: { id: id, companyId: req.company.id },
            data: { 
                name, 
                price: parseFloat(price), 
                duration: parseInt(duration) 
            },
        });
        res.status(200).json(updatedService);
    } catch (error) {
        console.error("Erro ao atualizar serviço:", error);
        res.status(500).json({ message: "Erro ao atualizar serviço." });
    }
};

// DELETAR Serviço
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.service.delete({
            where: { id: id, companyId: req.company.id },
        });
        res.status(204).send(); // Sucesso, sem conteúdo
    } catch (error) {
        console.error("--- ERRO DETALHADO AO DELETAR SERVIÇO ---", error);
        
        // Verifica se o erro é de restrição de chave estrangeira (P2003)
        if (error.code === 'P2003') {
            return res.status(409).json({ // 409 Conflict é um bom status para este caso
                message: "Este serviço não pode ser excluído, pois está sendo utilizado em um ou mais agendamentos." 
            });
        }
        
        // Para outros erros, mantém a resposta genérica
        res.status(500).json({ message: "Erro ao deletar serviço." });
    }
};