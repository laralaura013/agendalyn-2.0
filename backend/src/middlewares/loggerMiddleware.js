// src/middlewares/loggerMiddleware.js
export function companyLogger(req, _res, next) {
  const companyId =
    req.company?.id ||
    req.user?.companyId ||
    req.headers['x-company-id'] ||
    null;

  console.log(
    `📝 [${new Date().toISOString()}] ${req.method} ${req.originalUrl} | companyId: ${companyId}`
  );

  next();
}
