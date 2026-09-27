import { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import { LedgerType, LedgerEntry } from "../types/shared-types.js";

/**
 * Ledger provides an audit trail of all transactions and balance changes for a wallet.
 * It is used to ensure that the user's balance is always correct and to provide a history of all transactions.
 *
 * Each ledger entry is stored on user's shard
 */
export class LedgerRepository {
  async create(
    walletId: bigint,
    transactionId: bigint,
    amount: bigint,
    type: LedgerType,
    tx: Prisma.TransactionClient,
  ): Promise<LedgerEntry> {
    const ledgerEntity = await tx.ledger.create({
      data: {
        wallet_id: walletId,
        transaction_id: transactionId,
        amount: amount,
        type: type,
      },
    });
    return this.mapToLedgerEntry(ledgerEntity);
  }

  async findById(
    ledgerId: bigint,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<LedgerEntry | null> {
    const ledgerEntity = await client.ledger.findUnique({
      where: {
        id: ledgerId,
      },
    });
    return ledgerEntity ? this.mapToLedgerEntry(ledgerEntity) : null;
  }

  async getHistory(
    walletId: bigint,
    client: PrismaClient | Prisma.TransactionClient,
  ): Promise<LedgerEntry[]> {
    const ledgerEntities = await client.ledger.findMany({
      where: {
        wallet_id: walletId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    return ledgerEntities.map((entity) => this.mapToLedgerEntry(entity));
  }

  private mapToLedgerEntry(
    ledgerEntity: Prisma.LedgerGetPayload<{}>,
  ): LedgerEntry {
    return {
      id: ledgerEntity.id,
      walletId: ledgerEntity.wallet_id,
      transactionId: ledgerEntity.transaction_id,
      amount: ledgerEntity.amount,
      type: ledgerEntity.type as LedgerType,
      createdAt: ledgerEntity.created_at,
    };
  }
}
