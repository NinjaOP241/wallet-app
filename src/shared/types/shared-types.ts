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
  transactionId: bigint;
  amount: bigint;
  type: LedgerType;
  createdAt: Date;
}
