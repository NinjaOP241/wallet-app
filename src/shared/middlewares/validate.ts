import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { badRequest } from "../utils/api-error.js";

export const validateBody = (schema: z.ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw badRequest("Validation failed", result.error.issues);
    }
    req.body = result.data;
    next();
  };
};

export const validateParams = (schema: z.ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      throw badRequest("Validation failed", result.error.issues);
    }
    req.validated.params = result.data;
    next();
  };
};
