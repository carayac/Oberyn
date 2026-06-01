import type { Request, Response } from "express";
import { Readable } from "node:stream";
import { gatewayService } from "../services/gateway.service.js";
import { ok } from "../utils/apiResponse.js";
export const gatewayController = {
  getConfig: async (req: Request, res: Response) => res.json(ok(await gatewayService.getConfig(req.params.projectId))),
  updateConfig: async (req: Request, res: Response) => res.json(ok(await gatewayService.updateConfig(req.params.projectId, req.body))),
  test: async (req: Request, res: Response) => res.json(ok(await gatewayService.test(req.params.projectId))),
  proxy: async (req: Request, res: Response) => {
    const result = await gatewayService.proxy(req);
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) res.setHeader(key, value);
    }
    if (result.decision) res.setHeader("x-oberyn-decision", result.decision);
    if (result.riskLevel) res.setHeader("x-oberyn-risk-level", result.riskLevel);
    if (result.stream) {
      res.status(result.status).type(result.contentType ?? "application/octet-stream");
      return Readable.fromWeb(result.stream as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
    }
    if (result.contentType && typeof result.body === "string") {
      return res.status(result.status).type(result.contentType).send(result.body);
    }
    res.status(result.status).json(result.body);
  },
};

