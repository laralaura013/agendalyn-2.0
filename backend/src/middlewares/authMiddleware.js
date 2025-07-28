import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // ✅ Correção aqui
      req.user = { id: decoded.id, role: decoded.role };
      req.company = { id: decoded.companyId };

      return next();
    } catch (error) {
      console.error('Erro de autenticação:', error.message);
      return res.status(401).json({ message: 'Não autorizado, token inválido.' });
    }
  }

  if (!token) {
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
