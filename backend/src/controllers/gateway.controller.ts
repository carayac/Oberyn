import type { Request, Response } from "express";
import { gatewayService } from "../services/gateway.service.js";
import { ok } from "../utils/apiResponse.js";
export const gatewayController = {
  getConfig: async (req: Request, res: Response) => res.json(ok(await gatewayService.getConfig(req.params.projectId))),
  test: async (req: Request, res: Response) => res.json(ok(await gatewayService.test(req.params.projectId))),
  proxy: async (req: Request, res: Response) => {
    const upstreamPath = `/${String(req.params[0] ?? "")}`;
    const result = await gatewayService.proxy({
      rawKey: req.header("x-oberyn-key") ?? req.header("authorization") ?? undefined,
      provider: req.params.provider,
      upstreamPath,
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    res.status(result.status);
    if (!result.blocked && result.contentType) res.type(result.contentType);
    return res.send(result.body);
  },
};
