import type { Request, Response } from "express";
import { sdkService } from "../services/sdk.service.js";
import { ok } from "../utils/apiResponse.js";

function getSdkKey(req: Request) {
  const explicitKey = req.header("x-oberyn-key") ?? req.header("x-oberyn-project-key");
  const authorization = req.header("authorization");
  if (explicitKey) return explicitKey;
  if (authorization?.startsWith("Bearer ")) return authorization.slice("Bearer ".length);
  return "";
}

export const sdkController = {
  getConfig: async (req: Request, res: Response) => res.json(ok(await sdkService.getConfig(req.params.projectId))),
  testEvent: async (req: Request, res: Response) => res.json(ok(await sdkService.testEvent(req.params.projectId, req.body))),
  ingestEvent: async (req: Request, res: Response) => res.status(202).json(ok(await sdkService.ingestEvent(getSdkKey(req), req.body))),
  ingestBatch: async (req: Request, res: Response) => res.status(202).json(ok(await sdkService.ingestBatch(getSdkKey(req), req.body))),
  heartbeat: async (req: Request, res: Response) => res.status(202).json(ok(await sdkService.heartbeat(getSdkKey(req), req.body))),
};

