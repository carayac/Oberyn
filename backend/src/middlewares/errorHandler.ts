import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.code === "ENOTFOUND" && String(error?.hostname ?? "").includes("supabase.co")) {
    return res.status(503).json({
      success: false,
      error: {
        message:
          "No se pudo resolver el host directo de Supabase. Usa la connection string del pooler de Supabase en DATABASE_URL o habilita IPv6 para la conexion directa.",
      },
    });
  }

  const status = typeof error.status === "number" ? error.status : 500;
  res.status(status).json({ success: false, error: { message: error.message ?? "Internal server error" } });
};
