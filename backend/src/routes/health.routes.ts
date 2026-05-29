import { Router } from "express";
import { ok } from "../utils/apiResponse.js";

export const healthRoutes = Router();
healthRoutes.get("/", (_req, res) => res.json(ok({ status: "ok", service: "oberyn-api" })));

