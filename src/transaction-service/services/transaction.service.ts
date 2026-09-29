import { TransactionRepository } from "../../shared/repositories/transaction.repository.js";
import { connectionManager } from "../../shared/database/connection-manager.js";
import {
  ShardId,
  Transaction,
  TransactionStatus,
} from "../../shared/types/shared-types.js";
import { ShardResolver } from "../../shared/database/shard-resolver.js";
import { notFound } from "../../shared/utils/api-error.js";

export class TransactionService {
  private readonly transactionRepository: TransactionRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
  }

  /**
   * Create a transaction
   *
   * STEPS:
   * 1. Find the sender shard from fromUser
   * 2. Start the transaction on that shard
   * 3. Check existing transaction by idempotency key
   * 4. If found return it
   * 5. Otherwise, create a PENDING transaction
   */
  async createTransaction(
    fromUser: bigint,
    toUser: bigint,
    amount: bigint,
    idempotencyKey: string,
  ): Promise<Transaction> {
    const shardId = ShardResolver.getShardId(fromUser);

    return connectionManager.executeInTransaction(shardId, async (tx) => {
      const existingTransaction =
        await this.transactionRepository.findByIdempotencyKey(
          idempotencyKey,
          tx,
        );

      if (existingTransaction) return existingTransaction;

      return this.transactionRepository.create(
        fromUser,
        toUser,
        amount,
        idempotencyKey,
        tx,
      );
    });
  }

  /**
   * Update transaction status
   *
   * STEPS:
   * 1. Find the sender shard from fromUser
   * 2. Update the transaction status
   */
  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    fromUser: bigint,
  ): Promise<Transaction> {
    const shardId = ShardResolver.getShardId(fromUser);
    const client = connectionManager.getClient(shardId);

    const transaction = await this.transactionRepository.updateStatus(
      transactionId,
      status,
      client,
    );

    if (!transaction) throw notFound("Transaction not found");

    return transaction;
  }

  /**
   * Get transaction history of a user
   */
  async getHistory(userId: bigint): Promise<Transaction[]> {
    const client1 = connectionManager.getClient(ShardId.SHARD_1);
    const client2 = connectionManager.getClient(ShardId.SHARD_2);

    return this.transactionRepository.getHistory(userId, client1, client2);
  }

  async getTransactionByIdempotencyKey(
    idempotencyKey: string,
    fromUser: bigint,
  ): Promise<Transaction | null> {
    const shardId = ShardResolver.getShardId(fromUser);
    const client = connectionManager.getClient(shardId);

    return this.transactionRepository.findByIdempotencyKey(
      idempotencyKey,
      client,
    );
  }

  async getTransactionById(
    transactionId: string,
    fromUser: bigint,
  ): Promise<Transaction | null> {
    const shardId = ShardResolver.getShardId(fromUser);
    const client = connectionManager.getClient(shardId);

    return this.transactionRepository.findById(transactionId, client);
  }
}
