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
    req: Request,
    res: Response,
  ): Promise<void> {
    const wallet = await this.walletService.createWallet(req.body.userId);

    const response = this.toWalletResponse(wallet);
    sendSuccess(res, response, 201, "Wallet created successfully");
  }

  async getWallet(
    req: Request,
    res: Response,
  ): Promise<void> {
    const params = req.validated.params as GetWalletParamsDTO;
    const wallet = await this.walletService.getWallet(params.userId);

    if (!wallet) throw notFound("Wallet not found");

    const response = this.toWalletResponse(wallet);
    sendSuccess(res, response);
  }

  async addMoney(
    req: Request,
    res: Response,
  ): Promise<void> {
    const params = req.validated.params as AddMoneyParamsDTO;
    const wallet = await this.walletService.addMoney(
      params.userId,
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
