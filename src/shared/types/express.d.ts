import "express";

declare global {
  namespace Express {
    interface Request {
      validatedParams?: unknown;
    }
  }
}

export {};
