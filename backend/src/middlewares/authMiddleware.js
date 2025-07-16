import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      // Extrai o token do cabeçalho (formato "Bearer TOKEN")
      token = authHeader.split(' ')[1];

      // Verifica o token usando a chave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Anexa os dados do usuário e da empresa à requisição (req)
      // para que as próximas funções (controladores) saibam quem está logado.
      // Isso é crucial para a arquitetura multi-tenant.
      req.user = { id: decoded.userId, role: decoded.role };
      req.company = { id: decoded.companyId };

      next(); // Se o token for válido, prossegue para o controlador da rota
    } catch (error) {
      console.error('Erro de autenticação:', error.message);
      return res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado, token não fornecido.' });
  }
};