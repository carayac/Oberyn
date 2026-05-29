import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = typeof error.status === "number" ? error.status : 500;
  res.status(status).json({ success: false, error: { message: error.message ?? "Internal server error" } });
};

