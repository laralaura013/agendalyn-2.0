import jwt from 'jsonwebtoken';

console.log("--- DEBUG: authMiddleware.js foi carregado ---");

export const protect = (req, res, next) => {
  console.log("--- DEBUG: A função 'protect' foi chamada ---");
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = { id: decoded.userId, role: decoded.role };
      req.company = { id: decoded.companyId };

      console.log(`--- DEBUG: Token verificado com sucesso para companyId: ${req.company.id} ---`);
      next();
    } catch (error) {
      console.error('--- DEBUG: Erro de autenticação no protect ---', error.message);
      return res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  }

  if (!token) {
    console.log("--- DEBUG: Token não fornecido no cabeçalho ---");
    return res.status(401).json({ message: 'Não autorizado, token não fornecido.' });
  }
};

export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para realizar esta ação.' });
    }
    next();
  };
};