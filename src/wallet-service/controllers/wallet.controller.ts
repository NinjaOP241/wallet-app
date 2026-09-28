import { Request, Response } from "express";
import { Wallet } from "./../../shared/types/shared-types.js";
import { WalletService } from "../services/wallet.service.js";
import {
  AddMoneyDTO,
  AddMoneyParamsDTO,
  CreateWalletDTO,
  GetWalletParamsDTO,
  WalletResponseDTO,
} from "../../shared/dto/wallet.dto.js";
import { sendSuccess } from "../../shared/utils/api-response.js";
import { notFound } from "../../shared/utils/api-error.js";

export class WalletController {
  private readonly walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(
    req: Request<{}, unknown, CreateWalletDTO>,
    res: Response,
  ): Promise<void> {
    const wallet = await this.walletService.createWallet(req.body.userId);

    const response = this.toWalletResponse(wallet);
    sendSuccess(res, response, 201, "Wallet created successfully");
  }

  async getWallet(
    req: Request<GetWalletParamsDTO>,
    res: Response,
  ): Promise<void> {
    const wallet = await this.walletService.getWallet(req.params.userId);

    if (!wallet) throw notFound("Wallet not found");

    const response = this.toWalletResponse(wallet);
    sendSuccess(res, response);
  }

  async addMoney(
    req: Request<AddMoneyParamsDTO, unknown, AddMoneyDTO>,
    res: Response,
  ): Promise<void> {
    const wallet = await this.walletService.addMoney(
      req.params.userId,
      req.body.amount,
    );

    const response = this.toWalletResponse(wallet);
    sendSuccess(res, response, 200, "Money added successfully");
  }

  private toWalletResponse(wallet: Wallet): WalletResponseDTO {
    return {
      id: wallet.id.toString(),
      userId: wallet.userId.toString(),
      balance: wallet.balance.toString(),
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }
}
