import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { idempotentStore } from "../utils/idempotency-store.js";
import {
  badRequest,
  conflict,
  unprocessableEntity,
} from "../utils/api-error.js";

interface IdempotencyOptions {
  //  Header containing the client-provided idempotency key.
  headerName?: string;

  // HTTP methods that require idempotency.
  requiredForMethods?: string[];
}

const defaultOptions = {
  headerName: "Idempotency-Key",
  requiredForMethods: ["POST", "PUT", "PATCH"],
};

/**
 * Creates a deterministic fingerprint of the request body.
 *
 * Why?
 * An idempotency key should represent one specific operation.
 *
 * Example:
 *   Key: ABC123
 *   Body: { amount: 500 }
 *
 * If the same key is later used with:
 *   Body: { amount: 1000 }
 *
 * the hashes will differ, allowing us to reject the request
 * instead of treating it as the same operation.
 */
function hashRequest(body: any): string {
  const content = JSON.stringify(body) || "";

  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Validates that the key is a UUID v4.
 */
function isValidKey(key: string): boolean {
  const uuidV4Regex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return uuidV4Regex.test(key);
}

/**
 * Creates the idempotency middleware.
 *
 * The middleware is responsible for:
 * 1. Validating the idempotency key.
 * 2. Detecting duplicate/replayed requests.
 * 3. Preventing a request from being executed again while it is
 *    already processing.
 * 4. Capturing the original response so it can be replayed later.
 */
export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    // Idempotency is only needed for state-changing requests.
    if (!config.requiredForMethods?.includes(req.method)) {
      return next();
    }

    // Read the client-provided idempotency key.
    const idempotencyKey = req.headers[
      config.headerName.toLowerCase()
    ] as string;

    if (!idempotencyKey) {
      throw badRequest(
        "Missing idempotency key",
        `The ${config.headerName} header is required for ${req.method} requests`,
      );
    }

    if (!isValidKey(idempotencyKey)) {
      throw badRequest(
        "Invalid idempotency key format",
        "Idempotency-Key must be a valid UUID v4",
      );
    }

    /**
     * Build the internal storage key.
     *
     * The client only provides:
     *   Idempotency-Key: ABC123
     *
     * We combine it with the HTTP method and endpoint so that the
     * same client key can safely be used for different operations.
     *
     * Example:
     *   POST:/transfer:ABC123
     *   POST:/refund:ABC123
     *
     * These are treated as two different idempotent operations.
     */
    const compositeKey = `${req.method}:${req.path}:${idempotencyKey}`;

    // Prevent the same key from being reused with different request data.
    const requestHash = hashRequest(req.body);

    const existingRecord = idempotentStore.get(compositeKey);

    if (existingRecord) {
      // A key must always refer to the same request.
      if (existingRecord.requestHash !== requestHash) {
        throw unprocessableEntity(
          "Idempotency key reused with different request",
          "Each unique request must use a unique idempotency key",
        );
      }

      // Another request with the same key is still running.
      if (existingRecord.status === "processing") {
        throw conflict(
          "Request in progress",
          "A request with this idempotency key is currently being processed",
        );
      }

      // Replay the previously stored response instead of executing again.
      if (existingRecord.response) {
        /**
         * Add a response header to tell the client that this response was
         * returned from the idempotency cache instead of running the request again.
         */
        res.set("Idempotent-Replayed", "true");

        /**
         * Restore headers that were captured from the original response.
         */
        for (const [key, value] of Object.entries(
          existingRecord.response.headers,
        )) {
          res.set(key, value);
        }

        /**
         * Reconstruct the original HTTP response:
         * - same status code
         * - same response body
         *
         * The actual business operation is NOT executed again.
         */
        return res
          .status(existingRecord.response.statusCode)
          .json(existingRecord.response.body);
      }
    }

    /**
     * No existing record was found, so this is the first request
     * using this idempotency key.
     *
     * Create a "processing" record BEFORE calling next().
     *
     * This is important because another request using the same key
     * may arrive while this request is still executing. That request
     * will then see status = "processing" and will not execute the
     * business operation a second time.
     */
    idempotentStore.set(compositeKey, {
      status: "processing",
      requestHash,
      createdAt: new Date(),
    });

    /**
     * Save the original Express response methods before overriding them.
     *
     * We need to intercept res.json()/res.send() to capture the response,
     * but we still want Express's original behavior after capturing it.
     */
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    /**
     * Stores the response so it can be replayed on retry.
     */
    const captureResponse = (body: any) => {
      /**
       * Retrieve the processing record created above.
       *
       * We need to update this record with the final response.
       */
      const record = idempotentStore.get(compositeKey);

      /**
       * Only update the record if it still represents an active request.
       */
      if (record && record.status === "processing") {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

        idempotentStore.set(compositeKey, {
          ...record,
          status: isSuccess ? "completed" : "failed",
          response: {
            statusCode: res.statusCode,
            body,
            headers: {
              "Content-Type": res.get("Content-Type") || "application/json",
            },
          },
          completedAt: new Date(),
        });
      }
      return body;
    };

    // Capture JSON responses before sending them.
    res.json = (body: any) => {
      captureResponse(body);
      return originalJson(body);
    };

    // Capture object responses sent through res.send().
    res.send = (body: any) => {
      if (typeof body === "object") {
        captureResponse(body);
      }
      return originalSend(body);
    };

    // Remove the record if the response stream fails.
    res.on("error", () => {
      idempotentStore.delete(compositeKey);
    });

    // Continue to the controller/business logic.
    next();
  };
}
