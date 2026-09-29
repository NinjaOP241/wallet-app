import { ShardId } from "../../shared/types/shared-types.js";

export interface SagaContext {
  transactionId?: string;
  fromShardId: ShardId;
  toShardId: ShardId;
  fromUser: bigint;
  toUser: bigint;
  amount: bigint;
  idempotencyKey: string;
  debitCommitted?: boolean; // Record whether the debit step actually committed.
  creditCommitted?: boolean; // Record whether the credit step actually committed.
  [key: string]: any; // Allow additional properties to be added dynamically.
}
