import {
  Transaction,
  TransactionStatus,
} from "../../shared/types/shared-types.js";
import {
  badRequest,
  conflict,
  internalServerError,
  notFound,
} from "../../shared/utils/api-error.js";
import { TransactionService } from "../../transaction-service/services/transaction.service.js";
import { WalletService } from "../../wallet-service/services/wallet.service.js";
import { CreateTransactionStep } from "../steps/create-transaction-step.js";
import { CreditReceiverStep } from "../steps/credit-receiver-step.js";
import { DebitSenderStep } from "../steps/debit-sender-step.js";
import { UpdateStatusCreditedStep } from "../steps/update-status-credited-step.js";
import { UpdateStatusDebitedStep } from "../steps/update-status-debited-step.js";
import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";

export class SagaOrchestrator {
  private readonly steps: readonly SagaStep<SagaContext>[];
  private readonly transactionService: TransactionService;

  constructor(
    walletService: WalletService,
    transactionService: TransactionService,
  ) {
    this.transactionService = transactionService;

    this.steps = [
      new CreateTransactionStep(transactionService),
      new DebitSenderStep(walletService),
      new UpdateStatusDebitedStep(transactionService),
      new CreditReceiverStep(walletService),
      new UpdateStatusCreditedStep(transactionService),
    ];
  }

  async execute(context: SagaContext): Promise<Transaction> {
    this.validateContext(context);

    /**
     * Prevent replaying an already existing transaction
     */
    const existingTransaction =
      await this.transactionService.getTransactionByIdempotencyKey(
        context.idempotencyKey,
        context.fromUser,
      );

    if (existingTransaction) {
      if (existingTransaction.status === TransactionStatus.CREDITED) {
        return existingTransaction;
      }

      if (existingTransaction.status === TransactionStatus.FAILED) {
        throw conflict("Transaction has already failed.");
      }

      throw conflict(
        "Transaction is already in progress and cannot be safely retried.",
      );
    }

    const completedSteps: SagaStep<SagaContext>[] = [];

    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];

        console.info(
          `Executing step ${i + 1}/${this.steps.length}: ${step.name}`,
        );

        await step.execute(context);

        // Only compensate steps whose execute() completed successfully.
        completedSteps.push(step);
      }
    } catch (error) {
      const compensationErrors = await this.compensate(completedSteps, context);

      await this.markTransactionFailed(context);

      if (compensationErrors.length > 0) {
        throw new AggregateError(
          [error, ...compensationErrors],
          "Saga failed and compensation was not fully successful.",
        );
      }

      throw error;
    }

    if (!context.transactionId) {
      throw internalServerError("Transaction ID missing after Saga execution.");
    }

    const transaction = await this.transactionService.getTransactionById(
      context.transactionId,
      context.fromUser,
    );

    if (!transaction) {
      throw notFound("Transaction not found after Saga execution.");
    }

    return transaction;
  }

  private async compensate(
    completedSteps: SagaStep<SagaContext>[],
    context: SagaContext,
  ): Promise<unknown[]> {
    const compensationErrors: unknown[] = [];

    // Compensate in reverse order of execution
    while (completedSteps.length > 0) {
      const step = completedSteps.pop()!;

      try {
        console.info(`Compensating step: ${step.name}`);
        await step.compensate(context);
      } catch (error) {
        /**
         * Do not let one compensation failure prevent us from
         * attempting the remaining compensations.
         */
        compensationErrors.push({
          step: step.name,
          error,
        });
        console.error(`Failed to compensate step ${step.name}:`, error);
      }
    }
    return compensationErrors;
  }

  private validateContext(context: SagaContext): void {
    if (context.amount <= 0n) {
      throw badRequest("Amount must be greater than zero.");
    }

    if (context.fromUser === context.toUser) {
      throw badRequest("Sender and receiver cannot be the same user.");
    }
  }

  private async markTransactionFailed(context: SagaContext): Promise<void> {
    if (!context.transactionId) return;

    try {
      await this.transactionService.updateStatus(
        context.transactionId,
        TransactionStatus.FAILED,
        context.fromUser,
      );
    } catch (error) {
      console.error("CRITICAL: Failed to mark transaction as FAILED:", error);
    }
  }
}
