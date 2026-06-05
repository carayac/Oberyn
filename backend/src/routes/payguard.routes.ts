import { Router } from "express";
import { payguardController } from "../controllers/payguard.controller.js";
import { requireProjectAccess } from "../middlewares/requireProjectAccess.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const payguardRoutes = Router({ mergeParams: true });

payguardRoutes.use(requireProjectAccess);
payguardRoutes.get("/", asyncHandler(payguardController.summary));
payguardRoutes.post("/agents", asyncHandler(payguardController.createAgent));
payguardRoutes.post("/wallets", asyncHandler(payguardController.upsertTrustedWallet));
payguardRoutes.post("/requests", asyncHandler(payguardController.createPaymentRequest));
payguardRoutes.post("/requests/:paymentRequestId/approve", asyncHandler(payguardController.approve));
payguardRoutes.post("/requests/:paymentRequestId/reject", asyncHandler(payguardController.reject));
payguardRoutes.post("/requests/:paymentRequestId/block", asyncHandler(payguardController.block));
payguardRoutes.post("/requests/:paymentRequestId/create-escrow", asyncHandler(payguardController.createEscrow));
payguardRoutes.post("/requests/:paymentRequestId/fund", asyncHandler(payguardController.fundEscrow));
payguardRoutes.post("/requests/:paymentRequestId/release", asyncHandler(payguardController.releaseEscrow));
payguardRoutes.get("/escrows/:escrowId/status", asyncHandler(payguardController.getEscrowStatus));
