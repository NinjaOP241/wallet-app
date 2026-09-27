import { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import { Wallet } from "../types/shared-types.js";

export class WalletRepository {
  async create(userId: bigint, tx: Prisma.TransactionClient): Promise<Wallet> {
    const walletEntity = await tx.wallet.create({
      data: {
        user_id: userId,
        balance: BigInt(0),
      },
    });
    return this.mapToWallet(walletEntity);
  }

  async findById(
    walletId: bigint,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await client.wallet.findUnique({
      where: {
        id: walletId,
      },
    });

    return walletEntity ? this.mapToWallet(walletEntity) : null;
  }

  async findByUserId(
    userId: bigint,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await client.wallet.findUnique({
      where: {
        user_id: userId,
      },
    });

    return walletEntity ? this.mapToWallet(walletEntity) : null;
  }

  async findByUserIdWithLock(
    userId: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntities = await tx.$queryRaw<Prisma.WalletGetPayload<{}>[]>`
      SELECT * FROM "wallets" 
      WHERE "user_id" = ${userId} 
      FOR UPDATE;
    `;

    if (walletEntities.length == 0) return null;

    return this.mapToWallet(walletEntities[0]);
  }

  async updateBalance(
    walletId: bigint,
    newBalance: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet> {
    const updatedWallet = await tx.wallet.update({
      where: {
        id: walletId,
      },
      data: {
        balance: newBalance,
      },
    });

    return this.mapToWallet(updatedWallet);
  }

  async debit(
    userId: bigint,
    amount: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await this.findByUserIdWithLock(userId, tx);
    if (!walletEntity) return null;

    if (walletEntity.balance < amount) return null;

    const newBalance = walletEntity.balance - amount;
    return this.updateBalance(walletEntity.id, newBalance, tx);
  }

  async credit(
    userId: bigint,
    amount: bigint,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet | null> {
    const walletEntity = await this.findByUserIdWithLock(userId, tx);
    if (!walletEntity) return null;

    const newBalance = walletEntity.balance + amount;
    return this.updateBalance(walletEntity.id, newBalance, tx);
  }

  private mapToWallet(walletEntity: Prisma.WalletGetPayload<{}>): Wallet {
    return {
      id: walletEntity.id,
      userId: walletEntity.user_id,
      balance: walletEntity.balance,
      createdAt: walletEntity.created_at,
      updatedAt: walletEntity.updated_at,
    };
  }
}
