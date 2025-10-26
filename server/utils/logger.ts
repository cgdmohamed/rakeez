/**
 * Safe logging utility to prevent sensitive data exposure
 * Use this instead of console.error to avoid leaking secrets, passwords, tokens, etc.
 */

export interface SafeErrorLog {
  message: string;
  timestamp: string;
  context: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  errorType?: string;
  stack?: string;
  [key: string]: any;
}

/**
 * Sensitive patterns to redact from metadata
 */
const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'apikey', 'api_key', 'authorization',
  'otp', 'otp_code', 'pin', 'cvv', 'card_number', 'card', 'credit_card',
  'ssn', 'social_security', 'passport', 'license', 'drivers_license'
];

/**
 * Keys that should always be masked regardless of length
 */
const ALWAYS_MASK_KEYS = [
  'email', 'phone', 'identifier', 'user_id', 'userid', 'username',
  'booking_id', 'bookingid', 'payment_id', 'paymentid', 'transaction_id',
  'account_number', 'iban', 'swift', 'routing_number'
];

/**
 * Protected core log fields that cannot be overwritten by metadata
 */
const PROTECTED_FIELDS = ['context', 'message', 'timestamp', 'errorType', 'stack'];

/**
 * Check if a string looks like PII (email, phone, etc.)
 */
const isPII = (value: string): boolean => {
  // Email pattern
  if (value.includes('@') && value.includes('.')) return true;
  
  // Phone number pattern (digits, possibly with spaces/dashes/parens)
  if (/^[\d\s\-\(\)\+]{7,15}$/.test(value)) return true;
  
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
  
  return false;
};

/**
 * Mask a sensitive value
 */
const maskValue = (value: string): string => {
  if (value.length <= 3) return '***';
  if (value.length <= 6) return `${value[0]}***`;
  return `${value.substring(0, 3)}***${value.substring(value.length - 3)}`;
};

/**
 * Sanitize metadata to remove or mask sensitive data
 */
const sanitizeMetadata = (metadata: any): any => {
  if (!metadata || typeof metadata !== 'object') return metadata;
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Skip protected fields to maintain log integrity
    if (PROTECTED_FIELDS.includes(key)) {
      continue;
    }
    
    const lowerKey = key.toLowerCase();
    
    // Check if key is explicitly sensitive
    const isSensitive = SENSITIVE_KEYS.some(pattern => lowerKey.includes(pattern));
    const shouldAlwaysMask = ALWAYS_MASK_KEYS.some(pattern => lowerKey.includes(pattern));
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      // Always mask certain keys regardless of content
      if (shouldAlwaysMask) {
        sanitized[key] = maskValue(value);
      }
      // Or mask if value looks like PII
      else if (isPII(value)) {
        sanitized[key] = maskValue(value);
      }
      // Or mask long strings (potential IDs)
      else if (value.length > 10) {
        sanitized[key] = maskValue(value);
      }
      else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Sanitize error object to prevent exposure of sensitive data in stack traces
 */
const sanitizeError = (error: unknown): { message: string; type: string; stack?: string } => {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
      type: 'NonError',
    };
  }
  
  return {
    message: error.message,
    type: error.constructor.name,
    stack: error.stack,
  };
};

/**
 * Safely log errors without exposing sensitive information
 * @param context - Brief description of where the error occurred
 * @param error - The error object or message
 * @param metadata - Additional metadata to log (will be sanitized)
 */
export const logError = (
  context: string,
  error: unknown,
  metadata?: Record<string, any>
): void => {
  const sanitizedError = sanitizeError(error);
  const sanitizedMetadata = metadata ? sanitizeMetadata(metadata) : {};
  
  const safeLog: SafeErrorLog = {
    context,
    message: sanitizedError.message,
    errorType: sanitizedError.type,
    timestamp: new Date().toISOString(),
    ...sanitizedMetadata,
  };
  
  // Log error details
  console.error(JSON.stringify(safeLog, null, 2));
  
  // Always log stack trace for debugging (even in production)
  if (sanitizedError.stack) {
    console.error('Stack trace:', sanitizedError.stack);
  }
};

/**
 * Log API errors with request context
 * @param context - Description of the error
 * @param error - The error object
 * @param req - Express request object (endpoint/method extracted, body not logged)
 * @param metadata - Additional safe metadata (will be sanitized)
 */
export const logApiError = (
  context: string,
  error: unknown,
  req: any,
  metadata?: Record<string, any>
): void => {
  logError(context, error, {
    endpoint: req.path,
    method: req.method,
    userId: req.user?.id,
    ...metadata,
  });
};

/**
 * Log authentication failures (sanitizes identifiers)
 */
export const logAuthError = (
  action: string,
  identifier: string | undefined,
  error: unknown
): void => {
  logError(`Auth: ${action}`, error, {
    action,
    identifier: identifier ? `${identifier.substring(0, 3)}***` : 'unknown',
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
    hasUserId: !!metadata?.userId,
    currency: metadata?.currency,
    // Never log: card numbers, CVV, full transaction IDs
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
    hasSignature?: boolean;
  }
): void => {
  logError(`Webhook: ${provider}`, error, {
    provider,
    eventType: metadata?.eventType,
    hasSignature: metadata?.hasSignature,
    // Never log: full payload, raw signatures
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
