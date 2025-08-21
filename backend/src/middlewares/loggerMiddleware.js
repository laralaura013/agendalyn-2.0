// src/middlewares/loggerMiddleware.js
import { bold, blue, green, yellow, magenta, gray, red, cyan } from "colorette";

function colorStatus(status) {
  if (status >= 500) return red(String(status));
  if (status >= 400) return yellow(String(status));
  if (status >= 300) return cyan(String(status));
  return green(String(status));
}

export function companyLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  // Dados que podemos extrair antes
  const origin =
    req.headers.origin ||
    req.get?.("Origin") ||
    "—";

  // Ao finalizar a resposta, montamos o log com status e duração
  res.on("finish", () => {
    const endedAt = process.hrtime.bigint();
    const durationMs = Number(endedAt - startedAt) / 1e6;

    const method = req.method;
    const url = req.originalUrl;
    const status = res.statusCode;

    const companyId =
      req.company?.id ||
      req.user?.companyId ||
      req.headers["x-company-id"] ||
      "—";

    const userId = req.user?.id || "—";
    const role = req.user?.role || "—";

    const time = new Date().toISOString();

    console.log(
      `${gray("📝 [" + time + "]")} ${bold(blue(method))} ${green(url)} | ` +
        `status: ${colorStatus(status)} | ` +
        `origin: ${yellow(origin)} | ` +
        `companyId: ${magenta(companyId)} | userId: ${magenta(userId)} | role: ${magenta(role)} | ` +
        `${gray(`${durationMs.toFixed(1)}ms`)}`
    );
  });

  next();
}
