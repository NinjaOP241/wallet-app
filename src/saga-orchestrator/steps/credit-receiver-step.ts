import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { WalletService } from "../../wallet-service/services/wallet.service.js";
import { connectionManager } from "../../shared/database/connection-manager.js";
import { notFound } from "../../shared/utils/api-error.js";

export class CreditReceiverStep implements SagaStep<SagaContext> {
  readonly name = "CreditReceiverStep";
  private readonly walletService: WalletService;

  constructor(walletService: WalletService) {
    this.walletService = walletService;
  }

  /**
   * 1. Start the transaction in the receiver's shard.
   * 2. Lock the receiver's account for update.
   * 3. Credit the receiver's account.
   * 4. Record the credit in the ledger.
   * 5. Mark context.creditCommitted as true to indicate that the credit step has been successfully executed.
   */
  async execute(context: SagaContext): Promise<void> {
    if (!context.transactionId)
      throw notFound(
        `Transaction ID not found in context for idempotency key: ${context.idempotencyKey}`,
      );

    const transactionId = context.transactionId;

    await connectionManager.executeInTransaction(
      context.toShardId,
      async (tx) => {
        await this.walletService.credit(
          context.toUser,
          context.amount,
          transactionId,
          tx,
        );
      },
    );

    context.creditCommitted = true;
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transactionId || !context.creditCommitted) return;

    const transactionId = context.transactionId;

    await connectionManager.executeInTransaction(
      context.toShardId,
      async (tx) => {
        await this.walletService.debit(
          context.toUser,
          context.amount,
          transactionId,
          tx,
        );
      },
    );

    context.creditCommitted = false;
  }
}
