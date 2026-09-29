import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";
import { TransactionService } from "../../transaction-service/services/transaction.service.js";

export class CreateTransactionStep implements SagaStep<SagaContext> {
  readonly name = "CreateTransactionStep";
  private readonly transactionService: TransactionService;

  constructor(transactionService: TransactionService) {
    this.transactionService = transactionService;
  }

  /**
   * 1. Check if a transaction with the same idempotency key already exists.
   * 2. If it exists, return the existing transaction.
   * 3. If it does not exist, create a new transaction with PENDING status.
   * 4. Return the created transaction.
   */
  async execute(context: SagaContext): Promise<void> {
    const existingTransaction =
      await this.transactionService.getTransactionByIdempotencyKey(
        context.idempotencyKey,
        context.fromUser,
      );

    if (existingTransaction) {
      context.transactionId = existingTransaction.id;
      return;
    }

    const transaction = await this.transactionService.createTransaction(
      context.fromUser,
      context.toUser,
      context.amount,
      context.idempotencyKey,
    );

    context.transactionId = transaction.id;
  }

  async compensate(_context: SagaContext): Promise<void> {
    /**
     * No compensation is needed for this step as it only creates a transaction record in the database.
     * Orchestrator can mark the transaction as FAILED.
     */
  }
}
