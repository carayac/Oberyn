import type { Request, Response } from "express";
import { gatewayService } from "../services/gateway.service.js";
import { ok } from "../utils/apiResponse.js";
export const gatewayController = {
  getConfig: async (req: Request, res: Response) => res.json(ok(await gatewayService.getConfig(req.params.projectId))),
  test: async (req: Request, res: Response) => res.json(ok(await gatewayService.test(req.params.projectId))),
};

