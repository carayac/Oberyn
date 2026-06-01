import type { Request, Response } from "express";
import { sdkService } from "../services/sdk.service.js";
import { ok } from "../utils/apiResponse.js";
export const sdkController = {
  getConfig: async (req: Request, res: Response) => res.json(ok(await sdkService.getConfig(req.params.projectId))),
  testEvent: async (req: Request, res: Response) => res.json(ok(await sdkService.testEvent(req.params.projectId, req.body))),
};

