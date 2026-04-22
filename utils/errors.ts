/**
 * Error handling utilities for the application.
 * Provides standardized error handling and custom error classes.
 */

import { Platform } from 'react-native';

// ===== ERROR CLASSES =====
export class AppError extends Error {
  code?: string;
  statusCode?: number;
  isOperational: boolean;

  constructor(
    message: string,
    code?: string,
    statusCode?: number,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (Platform.OS === 'web' && Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, true);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends AppError {
  originalUrl?: string;

  constructor(message: string, url?: string) {
    super(message, 'NETWORK_ERROR', 500, true);
    this.name = 'NetworkError';
    this.originalUrl = url;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401, true);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'AUTHZ_ERROR', 403, true);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  resourceType?: string;

  constructor(resource: string, type?: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, true);
    this.name = 'NotFoundError';
    this.resourceType = type;
  }
}

export class RateLimitError extends AppError {
  retryAfterMs?: number;

  constructor(retryAfterSeconds: number) {
    super(`Rate limit exceeded. Try again in ${retryAfterSeconds}s`, 'RATE_LIMIT', 429, true);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterSeconds * 1000;
  }
}

// ===== ERROR HANDLING =====
type ErrorHandler = (error: Error) => void;

const errorHandlers = new Set<ErrorHandler>();

export function registerErrorHandler(handler: ErrorHandler): () => void {
  errorHandlers.add(handler);
  return () => errorHandlers.delete(handler);
}

export function handleError(error: unknown): void {
  const normalized = normalizeError(error);
  
  errorHandlers.forEach((handler) => {
    try {
      handler(normalized);
    } catch {
      // Silently ignore handler errors
    }
  });

  // Log in development
  if (__DEV__) {
    console.error('[AppError]', normalized);
  }
}

export function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error('An unknown error occurred');
}

// ===== ERROR RECOVERY =====
export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: 2,
  shouldRetry: (error) => {
    const name = error.name;
    return name === 'NetworkError' || name === ' TimeoutError';
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultRetryOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = normalizeError(error);

      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      const delay = opts.delayMs * Math.pow(opts.backoff, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ===== ERROR RECOVERY WRAPPER =====
export function withErrorBoundary<P extends unknown[], R>(
  fn: (...args: P) => R,
  fallback: R,
  onError?: (error: Error) => void
): (...args: P) => R {
  return (...args: P) => {
    try {
      return fn(...args);
    } catch (error) {
      const normalized = normalizeError(error);
      onError?.(normalized);
      return fallback;
    }
  };
}

// ===== PROMISE ERROR HANDLING =====
export function safeAsync<T>(
  promise: Promise<T>,
  fallback: T
): Promise<T> {
  return promise.catch(() => fallback);
}

export function toSafePromise<T>(
  promise: Promise<T>
): Promise<[Error | null, T | null]> {
  return promise
    .then((data) => [null, data] as const)
    .catch((error) => [normalizeError(error), null] as const);
}