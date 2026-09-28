import { z } from "zod";

/* ============================================================
   Request DTOs
   ============================================================ */

/**
 * Request body for creating a wallet.
 *
 * `userId` is received as a string because JSON does not support
 * bigint values. It is validated and transformed into bigint.
 */
export const createWalletSchema = z.object({
  userId: z
    .string()
    .regex(/^[1-9]\d*$/, "userId must be a positive integer")
    .transform(BigInt),
});

export type CreateWalletDTO = z.infer<typeof createWalletSchema>;

/**
 * Route parameters for retrieving a wallet.
 *
 * Example:
 * GET /api/wallets/123
 */
export const getWalletParamsSchema = z.object({
  userId: z
    .string()
    .regex(/^[1-9]\d*$/, "userId must be a positive integer")
    .transform(BigInt),
});

export type GetWalletParamsDTO = z.infer<typeof getWalletParamsSchema>;

/**
 * Route parameters for adding money to a wallet.
 *
 * Example:
 * POST /api/wallets/123/add-money
 */
export const addMoneyParamsSchema = z.object({
  userId: z
    .string()
    .regex(/^[1-9]\d*$/, "userId must be a positive integer")
    .transform(BigInt),
});

export type AddMoneyParamsDTO = z.infer<typeof addMoneyParamsSchema>;

/**
 * Request body for adding money to a wallet.
 *
 * `amount` is received as a string because JSON does not support
 * bigint values. It is validated and transformed into bigint.
 */
export const addMoneySchema = z.object({
  amount: z
    .string()
    .regex(/^[1-9]\d*$/, "amount must be a positive integer")
    .transform(BigInt),
});

export type AddMoneyDTO = z.infer<typeof addMoneySchema>;

/* ============================================================
   Response DTO
   ============================================================ */

/**
 * API representation of a wallet.
 *
 * BigInt and Date values are converted to strings before being
 * sent in the JSON response.
 */
export type WalletResponseDTO = {
  id: string;
  userId: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
};
