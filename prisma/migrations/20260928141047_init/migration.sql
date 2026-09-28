-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'DEBITED', 'CREDITED', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "from_wallet_id" BIGINT NOT NULL,
    "to_wallet_id" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger" (
    "id" BIGSERIAL NOT NULL,
    "wallet_id" BIGINT NOT NULL,
    "transaction_id" TEXT,
    "amount" BIGINT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_from_wallet_id" ON "transactions"("from_wallet_id");

-- CreateIndex
CREATE INDEX "idx_to_wallet_id" ON "transactions"("to_wallet_id");

-- CreateIndex
CREATE INDEX "idx_status" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "idx_idempotency_key" ON "transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "idx_wallet_id" ON "ledger"("wallet_id");

-- CreateIndex
CREATE INDEX "idx_transaction_id" ON "ledger"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_created_at" ON "ledger"("created_at");
