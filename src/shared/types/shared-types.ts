export enum ShardId {
  SHARD_1 = 1,
  SHARD_2 = 2,
}

export interface Wallet {
  id: bigint;
  userId: bigint;
  balance: bigint;
  createdAt: Date;
  updatedAt: Date;
}

export enum LedgerType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export interface LedgerEntry {
  id: bigint;
  walletId: bigint;
  transactionId: string | null;
  amount: bigint;
  type: LedgerType;
  createdAt: Date;
}

export enum TransactionStatus {
  PENDING = "PENDING",
  DEBITED = "DEBITED",
  CREDITED = "CREDITED",
  FAILED = "FAILED",
}

export interface Transaction {
  id: string;
  fromWalletId: bigint;
  toWalletId: bigint;
  amount: bigint;
  status: TransactionStatus;
  idempotencyKey: string;
  createdAt: Date;
}
