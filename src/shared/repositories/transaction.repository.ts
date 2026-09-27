import { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import { TransactionStatus, Transaction } from "../types/shared-types.js";

export class TransactionRepository {
  async create(
    fromWalletId: bigint,
    toWalletId: bigint,
    amount: bigint,
    idempotencyKey: string,
    tx: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const transactionEntity = await tx.transaction.create({
      data: {
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId,
        amount,
        idempotency_key: idempotencyKey,
      },
    });

    return this.mapToTransaction(transactionEntity);
  }

  async findById(
    transactionId: string,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await client.transaction.findUnique({
      where: {
        id: transactionId,
      },
    });
    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await client.transaction.findUnique({
      where: {
        idempotency_key: idempotencyKey,
      },
    });
    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<Transaction | null> {
    const transactionEntity = await client.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        status,
      },
    });
    return transactionEntity ? this.mapToTransaction(transactionEntity) : null;
  }

  /**
   * Get the transaction history for a given wallet across two shards.
   * Check both shards for transactions where the wallet is either the sender or the receiver.
   */
  async getHistory(
    walletId: bigint,
    client1: PrismaClient,
    client2: PrismaClient,
  ): Promise<Transaction[]> {
    const transactions = await Promise.all(
      [client1, client2].map((client) =>
        client.transaction.findMany({
          where: {
            OR: [{ from_wallet_id: walletId }, { to_wallet_id: walletId }],
          },
        }),
      ),
    );

    return transactions
      .flat()
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .map((entity) => this.mapToTransaction(entity));
  }

  private mapToTransaction(
    transactionEntity: Prisma.TransactionGetPayload<{}>,
  ): Transaction {
    return {
      id: transactionEntity.id,
      fromWalletId: transactionEntity.from_wallet_id,
      toWalletId: transactionEntity.to_wallet_id,
      amount: transactionEntity.amount,
      status: transactionEntity.status as TransactionStatus,
      idempotencyKey: transactionEntity.idempotency_key,
      createdAt: transactionEntity.created_at,
    };
  }
}
