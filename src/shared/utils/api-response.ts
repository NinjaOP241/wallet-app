import { Response } from "express";

/*
 * Defines the standard shape of every successful API response.
 *
 * T is a generic because the actual data can be anything:
 * - User object
 * - Event object
 * - Array of meetings
 * - String, number, etc.
 *
 * Examples:
 * SuccessPayload<User>
 * SuccessPayload<Event[]>
 */
interface SuccessPayload<T> {
  success: true;
  data: T;
  message?: string;
}

/*
 * Helper function used to send successful API responses in a consistent format.
 *
 * Why this exists:
 * Instead of writing:
 *
 * res.status(200).json({
 *   success: true,
 *   data: user,
 * });
 *
 * in every controller, we centralize the response format in one place.
 *
 * Benefits:
 * 1. Avoids repeating the same response structure everywhere.
 * 2. Keeps all successful responses consistent.
 * 3. If the response format changes in the future,
 *    we only need to update this file.
 *
 * Example:
 * sendSuccess(res, user);
 *
 * Response:
 * {
 *   success: true,
 *   data: user
 * }
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string,
): void {
  const body: SuccessPayload<T> = {
    success: true,
    data,
  };

  if (message) body.message = message;
  res.status(statusCode).json(body);
}
