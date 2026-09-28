import { Prisma } from "../../../generated/prisma/client.js";
import { connectionManager } from "../../shared/database/connection-manager.js";
import { ShardResolver } from "../../shared/database/shard-resolver.js";
import { LedgerRepository } from "../../shared/repositories/ledger.repository.js";
import { WalletRepository } from "../../shared/repositories/wallet.repository.js";
import { LedgerType, Wallet } from "../../shared/types/shared-types.js";
import {
  badRequest,
  conflict,
  notFound,
} from "../../shared/utils/api-error.js";

/**
 * Service responsible for wallet-related business operations.
 *
 * Handles wallet creation, retrieval, deposits, and wallet balance
 * changes during transfers. It coordinates the WalletRepository,
 * LedgerRepository, shard resolution, and database transactions.
 */
export class WalletService {
  private readonly walletRepository: WalletRepository;
  private readonly ledgerRepository: LedgerRepository;

  /**
   * Initializes the repositories used by the wallet service.
   */
  constructor() {
    this.walletRepository = new WalletRepository();
    this.ledgerRepository = new LedgerRepository();
  }

  /**
   * Creates a new wallet for a user.
   *
   * The wallet is created on the shard determined by the user's ID.
   * A wallet can only be created once for a user because `user_id`
   * is unique in the database.
   *
   * STEPS:
   * 1. Determine the user's shard from the user ID
   * 2. Get the Prisma client for that shard
   * 3. Check whether the user already has a wallet
   * 4. Throw a conflict error if the wallet already exists
   * 5. Create and return the new wallet
   *
   * @param userId - The ID of the user for whom the wallet is created.
   * @returns The newly created wallet.
   */
  async createWallet(userId: bigint): Promise<Wallet> {
    const shardId = ShardResolver.getShardId(userId);
    const client = connectionManager.getClient(shardId);

    const existingWallet = await this.walletRepository.findByUserId(
      userId,
      client,
    );

    if (existingWallet) throw conflict("Wallet already exists");

    return this.walletRepository.create(userId, client);
  }

  /**
   * Retrieves the wallet belonging to a user.
   *
   * The user's shard is determined from the user ID so that the query
   * is sent directly to the correct database shard.
   *
   * @param userId - The ID of the user whose wallet is being retrieved.
   * @returns The user's wallet, or null if no wallet exists.
   */
  async getWallet(userId: bigint): Promise<Wallet | null> {
    const shardId = ShardResolver.getShardId(userId);
    const client = connectionManager.getClient(shardId);

    return this.walletRepository.findByUserId(userId, client);
  }

  /**
   * Adds money to a user's wallet as a standalone wallet operation.
   *
   * This operation starts its own database transaction because it is
   * independent of the transfer Saga. The wallet row is pessimistically
   * locked before updating the balance.
   *
    * A CREDIT ledger entry without a transaction ID is created in the
  * same database transaction.
   *
   * STEPS:
   * 1. Validate that the amount is positive
   * 2. Determine the user's shard
   * 3. Start a database transaction on that shard
   * 4. Lock the wallet row using SELECT ... FOR UPDATE
   * 5. Verify that the wallet exists
   * 6. Increase the wallet balance
    * 7. Create a CREDIT ledger entry with a null transaction ID
   * 8. Commit the transaction
   *
   * @param userId - The ID of the user whose wallet is credited.
   * @param amount - The amount to add to the wallet.
   * @returns The updated wallet.
   */
  async addMoney(userId: bigint, amount: bigint): Promise<Wallet> {
    this.validateAmount(amount);

    const shardId = ShardResolver.getShardId(userId);

    return connectionManager.executeInTransaction(shardId, async (tx) => {
      const wallet = await this.walletRepository.findByUserIdWithLock(
        userId,
        tx,
      );

      if (!wallet) throw notFound("Wallet not found");

      const newBalance = wallet.balance + amount;
      const updatedWallet = await this.walletRepository.updateBalance(
        wallet.id,
        newBalance,
        tx,
      );

      await this.ledgerRepository.create(
        wallet.id,
        null,
        amount,
        LedgerType.CREDIT,
        tx,
      );

      return updatedWallet;
    });
  }

  /**
   * Debits money from a user's wallet as part of a transfer.
   *
   * This method is executed within a transaction controlled by the
   * transfer/Saga workflow. It does not create or manage its own
   * transaction.
   *
   * The wallet row is pessimistically locked before checking the balance
   * to prevent concurrent operations from modifying the same balance.
   * A DEBIT ledger entry is created in the same transaction.
   *
   * STEPS:
   * 1. Validate that the amount is positive
   * 2. Lock the wallet row using SELECT ... FOR UPDATE
   * 3. Verify that the wallet exists
   * 4. Verify that the wallet has sufficient balance
   * 5. Decrease the wallet balance
   * 6. Create a DEBIT ledger entry
   *
   * @param userId - The ID of the user whose wallet is debited.
   * @param amount - The amount to debit from the wallet.
   * @param transactionId - The ID of the transfer transaction.
   * @param tx - The transaction-scoped Prisma client provided by the caller.
   * @returns The updated wallet.
   */
  async debit(
    userId: bigint,
    amount: bigint,
    transactionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet> {
    this.validateAmount(amount);

    const wallet = await this.walletRepository.findByUserIdWithLock(userId, tx);

    if (!wallet) throw notFound("Wallet not found");

    if (wallet.balance < amount) throw badRequest("Insufficient balance");

    const newBalance = wallet.balance - amount;
    const updatedWallet = await this.walletRepository.updateBalance(
      wallet.id,
      newBalance,
      tx,
    );

    await this.ledgerRepository.create(
      wallet.id,
      transactionId,
      amount,
      LedgerType.DEBIT,
      tx,
    );

    return updatedWallet;
  }

  /**
   * Credits money to a user's wallet as part of a transfer.
   *
   * This method is executed within a transaction controlled by the
   * transfer/Saga workflow. It does not create or manage its own
   * transaction.
   *
   * The wallet row is pessimistically locked before updating the balance.
   * A CREDIT ledger entry is created in the same transaction.
   *
   * STEPS:
   * 1. Validate that the amount is positive
   * 2. Lock the wallet row using SELECT ... FOR UPDATE
   * 3. Verify that the wallet exists
   * 4. Increase the wallet balance
   * 5. Create a CREDIT ledger entry
   *
   * @param userId - The ID of the user whose wallet is credited.
   * @param amount - The amount to credit to the wallet.
   * @param transactionId - The ID of the transfer transaction.
   * @param tx - The transaction-scoped Prisma client provided by the caller.
   * @returns The updated wallet.
   */
  async credit(
    userId: bigint,
    amount: bigint,
    transactionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Wallet> {
    this.validateAmount(amount);

    const wallet = await this.walletRepository.findByUserIdWithLock(userId, tx);

    if (!wallet) throw notFound("Wallet not found");

    const newBalance = wallet.balance + amount;
    const updatedWallet = await this.walletRepository.updateBalance(
      wallet.id,
      newBalance,
      tx,
    );

    await this.ledgerRepository.create(
      wallet.id,
      transactionId,
      amount,
      LedgerType.CREDIT,
      tx,
    );

    return updatedWallet;
  }

  private validateAmount(amount: bigint) {
    if (amount <= 0n) throw badRequest("Amount must be positive");
  }
}
