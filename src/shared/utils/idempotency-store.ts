/**
 * Represents the state of an idempotent request.
 *
 * processing  -> Request has started but has not finished yet.
 * completed   -> Request finished successfully and its response is cached.
 * failed      -> Request finished with a non-2xx response and the response is cached.
 */
interface IdempotencyRecord {
  status: "processing" | "completed" | "failed";

  /**
   * Cached HTTP response of the original request.
   *
   * We store this so that a retry with the same idempotency key
   * can receive the same response without executing the operation again.
   */
  response?: {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };

  /**
   * Time when the idempotency record was first created.
   * Used to determine when the record should expire.
   */
  createdAt: Date;

  /**
   * Time when request processing finished.
   * Optional because a newly created record is still in "processing" state.
   */
  completedAt?: Date;

  /**
   * Fingerprint of the original request body.
   *
   * Used to detect accidental/malicious reuse of the same idempotency
   * key with a different request payload.
   */
  requestHash: string;
}

/**
 * Simple in-memory store for idempotency records.
 *
 * NOTE:
 * This implementation is intended for learning/basic usage.
 * Since data is stored inside the Node.js process:
 * - Records are lost when the process restarts.
 * - Multiple application instances do not share the same store.
 * - It is therefore not suitable as the final source of truth for a
 *   production distributed payment/wallet system.
 */
class InMemoryIdempotencyStore {
  /**
   * Stores records using the composite idempotency key.
   *
   * Example:
   * "POST:/transfer:ABC123"
   *      -> IdempotencyRecord
   */
  private records: Map<string, IdempotencyRecord> = new Map();

  /**
   * Time-to-live for an idempotency record.
   *
   * Example:
   * 24 hours means a record can remain valid for up to 24 hours
   * from the time it was created.
   */
  private ttlMs: number;

  /**
   * Timer responsible for periodically checking and removing
   * expired idempotency records.
   */
  private cleanInterval: NodeJS.Timeout;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;

    /**
     * Run cleanup once every hour.
     *
     * IMPORTANT:
     * ttlMs and cleanup interval have different purposes.
     *
     * ttlMs:
     *   "How long should a record remain valid?"
     *
     * cleanup interval:
     *   "How often should we check for expired records?"
     */
    this.cleanInterval = setInterval(() => this.cleanUp(), 60 * 60 * 1000);
  }

  /**
   * Retrieve an idempotency record by key.
   *
   * Returns undefined when no record exists.
   */
  get(key: string): IdempotencyRecord | undefined {
    return this.records.get(key);
  }

  /**
   * Create or update an idempotency record.
   *
   * The same method is used for:
   * - creating the initial "processing" record
   * - updating it to "completed"/"failed"
   * - storing the final response
   */
  set(key: string, record: IdempotencyRecord): void {
    this.records.set(key, record);
  }

  /**
   * Remove an idempotency record from the store.
   *
   * Used when:
   * - a record has expired
   * - processing failed in a way where we want a future retry to try again
   */
  delete(key: string): void {
    this.records.delete(key);
  }

  /**
   * Remove records that have exceeded their TTL.
   *
   * The cleanup process compares each record's creation time
   * against the calculated cutoff time.
   */
  private cleanUp(): void {
    // Example:
    // current time = 12:00
    // TTL = 24 hours
    // cutoff = yesterday 12:00
    //
    // Any record created before the cutoff is considered expired.
    const cutoff = Date.now() - this.ttlMs;

    for (const [key, record] of this.records) {
      if (record.createdAt.getTime() < cutoff) {
        this.records.delete(key);
      }
    }
  }

  /**
   * Stop the periodic cleanup timer.
   *
   * This does NOT delete the stored records.
   * It only stops future automatic cleanup executions.
   *
   * Useful during application shutdown or in tests.
   */
  stop(): void {
    clearInterval(this.cleanInterval);
  }
}

/**
 * Export one shared store instance.
 *
 * Because this object is created once when the module is loaded,
 * all parts of this Node.js process use the same in-memory Map.
 */
export const idempotentStore = new InMemoryIdempotencyStore();
