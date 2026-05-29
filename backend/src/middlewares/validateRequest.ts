import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      return res.status(400).json({ success: false, error: { message: "Invalid request", issues: result.error.issues } });
    }
    return next();
  };
}

