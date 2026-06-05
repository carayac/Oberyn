import type { Request, Response } from "express";
import { payguardService } from "../services/payguard.service.js";
import { created, ok } from "../utils/apiResponse.js";

function actorId(res: Response) {
  return String(res.locals.userId ?? "human-reviewer");
}

export const payguardController = {
  summary: async (req: Request, res: Response) => res.json(ok(await payguardService.summary(req.params.projectId))),
  createAgent: async (req: Request, res: Response) => res.status(201).json(created(await payguardService.createAgent(req.params.projectId, req.body))),
  upsertTrustedWallet: async (req: Request, res: Response) => res.status(201).json(created(await payguardService.upsertTrustedWallet(req.params.projectId, req.body))),
  createPaymentRequest: async (req: Request, res: Response) => res.status(201).json(created(await payguardService.createPaymentRequest(req.params.projectId, req.body))),
  approve: async (req: Request, res: Response) => res.json(ok(await payguardService.approve(req.params.projectId, req.params.paymentRequestId, actorId(res)))),
  reject: async (req: Request, res: Response) => res.json(ok(await payguardService.reject(req.params.projectId, req.params.paymentRequestId, actorId(res)))),
  block: async (req: Request, res: Response) => res.json(ok(await payguardService.block(req.params.projectId, req.params.paymentRequestId, actorId(res)))),
  createEscrow: async (req: Request, res: Response) => res.json(ok(await payguardService.createEscrow(req.params.projectId, req.params.paymentRequestId, actorId(res)))),
  fundEscrow: async (req: Request, res: Response) => res.json(ok(await payguardService.fundEscrow(req.params.projectId, req.params.paymentRequestId, actorId(res)))),
  releaseEscrow: async (req: Request, res: Response) => res.json(ok(await payguardService.releaseEscrow(req.params.projectId, req.params.paymentRequestId, actorId(res)))),
  getEscrowStatus: async (req: Request, res: Response) => res.json(ok(await payguardService.getEscrowStatus(req.params.escrowId))),
};
