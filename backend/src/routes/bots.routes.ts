import { Router } from "express";
import { botsController } from "../controllers/bots.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";
export const botsRoutes = Router({ mergeParams: true });
botsRoutes.use(requireProjectAccess);
botsRoutes.get("/", asyncHandler(botsController.list));
botsRoutes.post("/", asyncHandler(botsController.create));

