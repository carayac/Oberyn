import type { Request, Response } from "express";
import { sdkService } from "../services/sdk.service.js";
import { created, ok } from "../utils/apiResponse.js";
export const sdkController = {
  getConfig: async (req: Request, res: Response) => res.json(ok(await sdkService.getConfig(req.params.projectId))),
  createKey: async (req: Request, res: Response) => res.status(201).json(created(await sdkService.createKey(req.params.projectId, req.body))),
  revokeKey: async (req: Request, res: Response) => res.json(ok(await sdkService.revokeKey(req.params.projectId, req.params.keyId))),
  testEvent: async (req: Request, res: Response) => res.json(ok(await sdkService.testEvent(req.params.projectId, req.body))),
  evaluate: async (req: Request, res: Response) => res.json(ok(await sdkService.evaluateWithKey(req.header("x-oberyn-key") ?? req.header("authorization") ?? undefined, req.body))),
  audit: async (req: Request, res: Response) => res.json(ok(await sdkService.auditWithKey(req.header("x-oberyn-key") ?? req.header("authorization") ?? undefined, req.body))),
};
