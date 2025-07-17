import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// --- FUNÇÃO LISTAR ATUALIZADA COM DEBUG ---
export const listAnamnesisForms = async (req, res) => {
    console.log("--- DEBUG: 1. Entrou na função listAnamnesisForms ---");
    try {
        const companyId = req.company.id;
        console.log(`--- DEBUG: 2. Buscando fichas para a empresa ID: ${companyId} ---`);

        const forms = await prisma.anamnesisForm.findMany({
            where: { companyId: companyId },
            orderBy: { createdAt: 'desc' },
        });

        console.log(`--- DEBUG: 3. Encontrou ${forms.length} fichas. Enviando resposta... ---`);
        res.status(200).json(forms);
        console.log("--- DEBUG: 4. Resposta enviada com sucesso! ---");

    } catch (error) {
        console.error("--- ERRO AO LISTAR MODELOS DE ANAMNESE ---", error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
};

// As outras funções continuam as mesmas
export const createAnamnesisForm = async (req, res) => {
    try {
        const { title, questions } = req.body;
        const companyId = req.company.id;
        if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: "Título e pelo menos uma pergunta são obrigatórios." });
        }
        const newForm = await prisma.anamnesisForm.create({
            data: { title, questions, companyId }
        });
        res.status(201).json(newForm);
    } catch (error) {
        console.error("--- ERRO AO CRIAR MODELO DE ANAMNESE ---", error);
        res.status(500).json({ message: 'Erro ao criar modelo de ficha.' });
    }
};

export const saveAnamnesisAnswer = async (req, res) => {
    try {
        const { formId, clientId, answers } = req.body;
        const companyId = req.company.id;
        if (!formId || !clientId || !answers) {
            return res.status(400).json({ message: "ID do formulário, ID do cliente e respostas são obrigatórios." });
        }
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId: companyId }
        });
        if (!client) {
            return res.status(404).json({ message: "Cliente não encontrado nesta empresa." });
        }
        const newAnswer = await prisma.anamnesisAnswer.create({
            data: { formId, clientId, answers }
        });
        res.status(201).json(newAnswer);
    } catch (error) {
        console.error("--- ERRO AO SALVAR RESPOSTA DE ANAMNESE ---", error);
        res.status(500).json({ message: 'Erro ao salvar respostas da ficha.' });
    }
};

export const getClientAnamnesisHistory = async (req, res) => {
    try {
        const { clientId } = req.params;
        const companyId = req.company.id;
        const client = await prisma.client.findFirst({
            where: { id: clientId, companyId: companyId }
        });
        if (!client) {
            return res.status(404).json({ message: "Cliente não encontrado nesta empresa." });
        }
        const history = await prisma.anamnesisAnswer.findMany({
            where: { clientId: clientId },
            include: { form: { select: { title: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(history);
    } catch (error) {
        console.error("--- ERRO AO BUSCAR HISTÓRICO DE ANAMNESE ---", error);
        res.status(500).json({ message: 'Erro ao buscar histórico do cliente.' });
    }
};