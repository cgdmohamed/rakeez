/**
 * Safe logging utility to prevent sensitive data exposure
 * Use this instead of console.error to avoid leaking secrets, stack traces, etc.
 */

export interface SafeErrorLog {
  message: string;
  timestamp?: string;
  userId?: string;
  endpoint?: string;
  statusCode?: number;
  errorType?: string;
  [key: string]: any;
}

/**
 * Safely log errors without exposing sensitive information
 * @param context - Brief description of where the error occurred
 * @param error - The error object or message
 * @param metadata - Additional safe metadata to log
 */
export const logError = (
  context: string,
  error: unknown,
  metadata?: Partial<SafeErrorLog>
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
  
  const safeLog: SafeErrorLog = {
    context,
    message: errorMessage,
    errorType,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  
  // Log in JSON format for easy parsing
  console.error(JSON.stringify(safeLog, null, 2));
  
  // In development, also log the stack trace to a separate debug log
  if (process.env.NODE_ENV === 'development' && error instanceof Error && error.stack) {
    console.debug('Stack trace:', error.stack);
  }
};

/**
 * Log authentication failures
 */
export const logAuthError = (
  action: string,
  identifier: string | undefined,
  error: unknown
): void => {
  logError(`Auth: ${action}`, error, {
    identifier: identifier ? `${identifier.substring(0, 3)}***` : 'unknown',
    action,
  });
};

/**
 * Log payment errors (without exposing transaction details)
 */
export const logPaymentError = (
  paymentMethod: string,
  error: unknown,
  metadata?: {
    userId?: string;
    amount?: number;
    currency?: string;
  }
): void => {
  logError(`Payment: ${paymentMethod}`, error, {
    paymentMethod,
    // Only log safe metadata, not full payment details
    hasUserId: !!metadata?.userId,
    currency: metadata?.currency,
  });
};

/**
 * Log database errors (without exposing query details or schema)
 */
export const logDatabaseError = (
  operation: string,
  error: unknown,
  tableName?: string
): void => {
  logError(`Database: ${operation}`, error, {
    operation,
    table: tableName,
    // Never log: query content, parameters, schema details
  });
};

/**
 * Log webhook errors (without exposing payload)
 */
export const logWebhookError = (
  provider: string,
  error: unknown,
  metadata?: {
    eventType?: string;
    webhookId?: string;
  }
): void => {
  logError(`Webhook: ${provider}`, error, {
    provider,
    eventType: metadata?.eventType,
    webhookId: metadata?.webhookId,
    // Never log: full payload, signatures, raw data
  });
};

/**
 * Log API errors with request context
 */
export const logApiError = (
  endpoint: string,
  method: string,
  error: unknown,
  statusCode?: number,
  userId?: string
): void => {
  logError(`API: ${method} ${endpoint}`, error, {
    endpoint,
    method,
    statusCode,
    userId,
  });
};

/**
 * Sanitize error for client response (no stack traces, no internal details)
 */
export const sanitizeErrorForClient = (error: unknown): { message: string } => {
  // Never expose the actual error to clients
  return {
    message: 'An error occurred. Please try again or contact support.',
  };
};
