import { Router } from "express";
import { env } from "../config/env.js";

export const docsRoutes = Router();

function redirectTo(path: string) {
  return `${env.FRONTEND_URL}${path}`;
}

docsRoutes.get("/sdk", (_req, res) => res.redirect(302, redirectTo("/docs/sdk")));
docsRoutes.get("/gateway", (_req, res) => res.redirect(302, redirectTo("/docs/gateway")));
