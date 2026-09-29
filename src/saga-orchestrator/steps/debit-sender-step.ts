import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { connectionManager } from "../../shared/database/connection-manager.js";
import { WalletService } from "../../wallet-service/services/wallet.service.js";
import { notFound } from "../../shared/utils/api-error.js";

export class DebitSenderStep implements SagaStep<SagaContext> {
  readonly name = "DebitSenderStep";
  private readonly walletService: WalletService;

  constructor(walletService: WalletService) {
    this.walletService = walletService;
  }

  /**
   * 1. Start the transaction in the sender's shard.
   * 2. Lock the sender's account for update.
   * 3. Check if the sender has sufficient balance.
   * 4. [FAILURE]: If the sender does not have sufficient balance, throw an error
   * 5. Debit the sender's account.
   * 6. Record the debit in the ledger.
   * 7. Mark context.debitCommitted as true to indicate that the debit step has been successfully executed.
   */
  async execute(context: SagaContext): Promise<void> {
    if (!context.transactionId)
      throw notFound(
        `Transaction ID not found in context for idempotency key: ${context.idempotencyKey}`,
      );

    const transactionId = context.transactionId;

    await connectionManager.executeInTransaction(
      context.fromShardId,
      async (tx) => {
        /**
         * We are already using lock for update before debiting the sender's account in the wallet service.
         * Additionally, for insufficient balance, we are throwing an error in the wallet service itself.
         * So, we don't need to check for sufficient balance here.
         */
        await this.walletService.debit(
          context.fromUser,
          context.amount,
          transactionId,
          tx,
        );
      },
    );

    context.debitCommitted = true;
  }

  /**
   * Compensation logic for the debit step.
   * If the debit step has been executed successfully (context.debitCommitted is true),
   * we need to credit the sender's account
   */
  async compensate(context: SagaContext): Promise<void> {
    if (!context.transactionId || !context.debitCommitted) return;

    const transactionId = context.transactionId;

    await connectionManager.executeInTransaction(
      context.fromShardId,
      async (tx) => {
        await this.walletService.credit(
          context.fromUser,
          context.amount,
          transactionId,
          tx,
        );
      },
    );

    context.debitCommitted = false;
  }
}
