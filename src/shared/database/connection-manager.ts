import { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import { getPrismaClient } from "./prisma-clients.js";
import { ShardId } from "../types/shared-types.js";

export class ConnectionManager {
  /**
   * Returns the Prisma client associated with the requested shard.
   *
   * This method is mainly useful when a caller needs direct access
   * to a specific shard's Prisma client.
   *
   */
  static getClient(shardId: ShardId): PrismaClient {
    return getPrismaClient(shardId);
  }

  /**
   * Executes database operations inside a transaction on a single shard.
   *
   * Flow:
   * 1. Resolve the Prisma client for the requested shard.
   * 2. Start a database transaction on that shard.
   * 3. Pass the transaction-scoped client (`tx`) to the caller.
   * 4. Commit all operations if the callback succeeds.
   * 5. Roll back the entire transaction if the callback throws.
   *
   * `T` represents whatever value the transaction callback returns.
   */
  async executeInTransaction<T>(
    shardId: ShardId,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const client = getPrismaClient(shardId);

    return client.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
}

export const connectionManager = new ConnectionManager();
