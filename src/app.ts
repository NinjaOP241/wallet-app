import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";

import { walletRouter } from "./api-gateway/routes/wallet.routes.js";
import { transactionRouter } from "./api-gateway/routes/transaction.routes.js";

import { errorHandler } from "./shared/middlewares/error-handler.js";

export function createApp(): Express {
  const app: Express = express();

  app.use(cors());
  app.use(helmet());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api/wallets", walletRouter);
  app.use("/api/transactions", transactionRouter);

  app.use(errorHandler);
  return app;
}
