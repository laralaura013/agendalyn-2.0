import jwt from 'jsonwebtoken';

// Esta função continua a mesma: verifica se o token é válido
export const protect = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Anexa os dados do usuário e da empresa à requisição
      req.user = { id: decoded.userId, role: decoded.role };
      req.company = { id: decoded.companyId };

      next();
    } catch (error) {
      console.error('Erro de autenticação:', error.message);
      return res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado, token não fornecido.' });
  }
};

// --- NOVA FUNÇÃO ---
// Middleware para verificar se o usuário tem uma das funções permitidas
export const checkRole = (roles) => {
  return (req, res, next) => {
    // Se a função do usuário (que veio do token) não está na lista de funções permitidas...
    if (!roles.includes(req.user.role)) {
      // Retorna um erro de "Acesso Negado"
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para realizar esta ação.' });
    }
    // Se tiver permissão, continua
    next();
  };
};