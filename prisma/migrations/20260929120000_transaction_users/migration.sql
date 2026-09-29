-- Store transfer participants by user ID so shard routing remains deterministic.
ALTER TABLE "transactions" RENAME COLUMN "from_wallet_id" TO "from_user_id";
ALTER TABLE "transactions" RENAME COLUMN "to_wallet_id" TO "to_user_id";

ALTER INDEX "idx_from_wallet_id" RENAME TO "idx_from_user_id";
ALTER INDEX "idx_to_wallet_id" RENAME TO "idx_to_user_id";