import { Router } from "express";
import { WalletController } from "../../wallet-service/controllers/wallet.controller.js";
import {
  validateBody,
  validateParams,
} from "../../shared/middlewares/validate.js";
import {
  addMoneyParamsSchema,
  addMoneySchema,
  createWalletSchema,
  getWalletParamsSchema,
} from "../../shared/dto/wallet.dto.js";
import { idempotencyMiddleware } from "../../shared/middlewares/idempotency.js";

export const walletRouter: Router = Router();
const walletController = new WalletController();

walletRouter.post(
  "/",
  validateBody(createWalletSchema),
  walletController.createWallet.bind(walletController),
);
walletRouter.get(
  "/:userId",
  validateParams(getWalletParamsSchema),
  walletController.getWallet.bind(walletController),
);
walletRouter.post(
  "/:userId/add-money",
  idempotencyMiddleware(),
  validateParams(addMoneyParamsSchema),
  validateBody(addMoneySchema),
  walletController.addMoney.bind(walletController),
);
