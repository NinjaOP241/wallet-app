import { TransactionStatus } from "../../shared/types/shared-types.js";
import { notFound } from "../../shared/utils/api-error.js";
import { TransactionService } from "../../transaction-service/services/transaction.service.js";
import { SagaContext } from "../types/saga-context.js";
import { SagaStep } from "../types/saga-step.js";

export class UpdateStatusCreditedStep implements SagaStep<SagaContext> {
  readonly name = "UpdateStatusCreditedStep";
  private transactionService: TransactionService;

  constructor(transactionService: TransactionService) {
    this.transactionService = transactionService;
  }

  async execute(context: SagaContext): Promise<void> {
    if (!context.transactionId)
      throw notFound(
        `Transaction ID not found in context for idempotency key: ${context.idempotencyKey}`,
      );

    await this.transactionService.updateStatus(
      context.transactionId,
      TransactionStatus.CREDITED,
      context.fromUser,
    );
  }

  async compensate(context: SagaContext): Promise<void> {
    if (!context.transactionId) return;

    await this.transactionService.updateStatus(
      context.transactionId,
      TransactionStatus.PENDING,
      context.fromUser,
    );
  }
}
