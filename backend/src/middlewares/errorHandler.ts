import type { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger.js";

function getErrorStatus(error: { status?: unknown; statusCode?: unknown }) {
  if (typeof error.status === "number") return error.status;
  if (typeof error.statusCode === "number") return error.statusCode;
  return 500;
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const status = getErrorStatus(error);
  logger.error(`[${req.method}] ${req.originalUrl} failed with ${status}`, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    stack: error?.stack,
  });

  if (error?.message === "Invalid API key") {
    return res.status(500).json({
      success: false,
      error: {
        message:
          "Supabase rechazó la API key del backend. Revisa que backend/.env tenga SUPABASE_URL y una SUPABASE_SERVICE_ROLE_KEY válida; la anon/publishable key no sirve para escribir con supabaseAdmin.",
      },
    });
  }

  if (error?.code === "ENOTFOUND" && String(error?.hostname ?? "").includes("supabase.co")) {
    return res.status(503).json({
      success: false,
      error: {
        message:
          "No se pudo resolver el host directo de Supabase. Usa la connection string del pooler de Supabase en DATABASE_URL o habilita IPv6 para la conexión directa.",
      },
    });
  }

  res.status(status).json({ success: false, error: { message: error.message ?? "Internal server error" } });
};
